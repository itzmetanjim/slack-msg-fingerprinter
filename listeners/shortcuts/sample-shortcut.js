const origFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
  const res = await origFetch(...args);
  const ct = res.headers.get("content-type") || "";
  console.log("[fetch]", res.status, ct.split(";")[0] || "(none)", "->", String(url).slice(0, 120));
  return res;
};
import { setTimeout as delay } from 'timers/promises';
process.loadEnvFile()
const maxmin=process.env.FINGERPRINTS_PER_MINUTE;
const amin=process.env.ANALYSES_PER_MINUTE;
const ratelimit_alg=process.env.RATELIMIT_ALG || "swc";
console.log({maxmin,amin,ratelimit_alg})
const aweight=maxmin/amin;

var flag=false
var ratemin=new Map() // user id: [minute, prev, now] or [minute,now] in FWC
function makerequest(uid,weight=1,minweight){
    if(!minweight) minweight=weight
    while(flag){}
    flag=true
    const ctime= Date.now()/1000;
    const cmin= Math.floor(ctime/60)
    var requests
    var ratec
    var xmin
    //cleanup stale entries
    for(const [i,e] of ratemin) if(cmin>e[0]+1) ratemin.delete(i)
    switch(ratelimit_alg){
        case "fwc":
            ratec=[...(ratemin.get(uid)||[-1,0])]
            xmin=ratec[0]
            if(cmin!==xmin){
                ratec=[cmin,weight]
            }else{
                ratec=[cmin,ratec[1]+weight]
            }
            requests=ratec[1]
        break;
        case "swc":
        default:
            const portion=ctime/60-cmin
            ratec=[...(ratemin.get(uid)||[-1,0,0])]
            xmin= ratec[0]
            do{
                if(cmin>xmin+1){
                    //always allowed
                    ratec=[cmin,0,weight]
                    break;
                }
                if(cmin===xmin+1){
                    ratec=[cmin,ratec[2],weight]
                    break;
                }
                if(cmin===xmin){
                    ratec=[cmin,ratec[1],ratec[2]+weight]
                }
            }while(false)
            requests=ratec[1]*(1-portion)+ratec[2]
            break
    }
    flag=false
    try{
        if (requests+minweight-weight>maxmin){
            return false
        }else{
            ratemin.set(uid,ratec)
            return true
        }
    }finally{

    }
}
async function sample(uid, client){
    const after=Math.floor(Date.now()/1000)-90*60*60*24
    const query= `from:<@${uid}>`
    const token= process.env.SLACK_USER_TOKEN

    let cursor
    const hits=[]
    do{
        const sres=await (client.assistant.search.context({
            after,query,token,cursor,
            content_types:["messages"],channel_types:["public_channel"]
            ,limit:1000,sort:"timestamp"
        }))
        cursor=sres.response_metadata.next_cursor
        console.log({cursor})
        hits.push(...sres.results.messages.map(e=>e.permalink))
    }while(cursor)
    return hits
}
const sampleShortcutCallback = async ({ shortcut, ack, client, logger }) => {
    try {
        const { message, channel, user, trigger_id } = shortcut;

        await ack();
        if(!makerequest(user.id)){
            try{
                await client.views.open({
                    trigger_id,
                    view: {
                        type: 'modal',
                        callback_id: 'sample_view_id',
                        title: {
                            type: 'plain_text',
                            text: 'ratelimit reached',
                        },
                        blocks: [
                            /*{
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "please wait",
                            "emoji": true
                        },
                        "level": 1
                    },*/
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `you have reached the ratelimit. please try again in 1 minute.`,
                                }
                            },
                            {
                                "type": "context",
                                "elements": [
                                    {
                                        type: 'mrkdwn',
                                        text: `ratelimit is ${maxmin} per minute`,
                                    }
                                ]}
                        ]
                    },
                });return}catch(e){
                    if(e.data?.error=='not_found'){
                    }else{
                        console.error(e)
                    }
                }

        }
        //console.log("\n==start========\n",message,channel,user,trigger_id,"\n===end==\n")
        var result=0
        try{
            result = await client.views.open({
                trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'sample_view_id',
                    title: {
                        type: 'plain_text',
                        text: 'please wait...',
                    },
                    blocks: [
                        /*{
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "please wait",
                            "emoji": true
                        },
                        "level": 1
                    },*/
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `calling coolton abuse API...`,
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    type: 'mrkdwn',
                                    text: `this may take a while, hang on. ratelimits: ${maxmin} per minute`,
                                }
                            ]}
                    ]
                },
            })}catch(e){
                if(e.data?.error=='not_found'){
                }else{
                    console.error(e); return
                }
            }
        var is_priv=false
        try{
            const cci=await client.conversations.info({channel:channel.id})
            is_priv=cci.channel.is_private
        } catch(e){
            if(e.data?.error=="channel_not_found"){
                is_priv=true
            }else{
                console.error(e)
            }
        }
        var the_bot=""
        if(message.bot_id || message.app_id || message.bot_profile){
            if(message.bot_profile?.user_id){
                the_bot=`<@${message.bot_profile.user_id}>`
            }
            else if(message.bot_id || message.bot_profile?.bot_id){
                //convert it to a user id! (if i can)
                try{
                    const bres=await client.bots.info({bot: message.bot_id || message.bot_profile?.bot_id})
                    if(bres.bot.user_id){the_bot=`<@${bres.bot.user_id}>`}
                    else{throw Error("Skipping to catch")}
                }catch{
                    // i cant convert this to a user id then :c
                    let bid=(message.bot_id||message.bot_profile?.bot_id||null)
                    let aid=(message.app_id||message.bot_profile?.app_id||null)
                    if(bid && aid){the_bot=`${bid}/${aid}`}
                    else{the_bot=`${bid||aid}`}
                }
            }
            if(message.bot_profile?.name){
                the_bot=the_bot?the_bot+` (${message.bot_profile?.name})`:message.bot_profile?.name
            }
            the_bot=the_bot?`the bot ${the_bot}`:`a bot`
        }
        if(the_bot){
            try{
                await client.views.update({
                    view_id: result.view.id,
                    view: {
                        type: 'modal',
                        callback_id: 'sample_view_id',
                        title: {
                            type: 'plain_text',
                            text: 'results',
                        },
                        blocks: [
                            {
                                "type": "header",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Verdict (from slack API):",
                                    "emoji": true
                                },
                                "level": 1
                            },
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `:msn-robot-3d-clean-2: This message is sent using ${the_bot}, clear as day. No coolton abuse API call is needed.`,
                                }
                            },
                            {
                                "type": "context",
                                "elements": [
                                    {
                                        type: 'mrkdwn',
                                        text: `slack tells you when a message is sent using a \`xoxb\` (sends as the bot) or \`xoxp\` (sends as the user) token directly in the message object. obviously no official slack client uses these kinds of tokens.`,
                                    }
                                ]}
                        ]
                    },
                });}catch(e){
                    if(e.data?.error=='not_found'){
                    }else{
                        console.error(e)
                    }
                }

            return
        }
        const delaypromise= delay(500+Math.random()*1000) //to prevent yall from reverse engineering the api, yes the dist is different in prod
        var rbody=1
        if(is_priv){rbody=JSON.stringify({message:message, channel:message.channel})}
        else{
            let {permalink}=(await client.chat.getPermalink({channel:channel.id,message_ts:message.ts}))
            rbody=JSON.stringify({permalink})
        }
        // console.log("!!! sending this: rbody /x\n",rbody,"\nx/")
        var fetchpromise= fetch(`${process.env.ANTIBOT_BASE_URL}`,{
            method:"POST",headers: { Authorization: `Bearer ${process.env.ANTIBOT_API_TOKEN}`, "Content-Type": "application/json" },
            body: rbody
        })
        //console.log("!!! JSON.stringify(shortcut) /x",JSON.stringify(shortcut),"\nx/")
        const [_,res]=await Promise.all([delaypromise,fetchpromise])
        const rjson=await res.json()
        // console.log("=== rjson ",rjson)
        const {verdict, categories}=rjson
        var vmessage="something went very wrong"
        if(verdict==="flag"){vmessage=":msn-robot-3d-clean-2: Likely an unofficial or automated client.\n\nUnless Slack added new features to messages recently, this is likely an unofficial or bot client. This does not mean it's an automated message; many alternative slack clients exist, and the user could be a human using one of those. *This is likely not Slick, Taut, or any other client mod.* Client mods are distinct from entire seperate clients."}
        if(verdict==="watch"){vmessage=":msn-mobile-phone: Likely the official Slack *iOS* client.\n\nThere's a small chance this is the Android client or an automated client instead."}
        if(verdict==="none"){vmessage=":msn-pc: Likely the official Slack Desktop/Web/Android client.\n\nBecause the desktop client is just Electron, it's impossible to distinguish messages between the Desktop and Web clients. Note that this is also the result that will be given when no patterns match, so it is possible that this is a mobile client or an unofficial client, *especially if the message is single-line and has no/minimal formatting.* Slick, Taut, and other client mods on the web/desktop client also match this."}
        const cvmessage=vmessage
        try{
            await client.views.update({
                view_id: result.view.id,
                view: {
                    type: 'modal',
                    callback_id: 'sample_view_id',
                    title: {
                        type: 'plain_text',
                        text: 'results',
                    },
                    blocks: [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": "Verdict (from coolton abuse API):",
                                "emoji": true
                            },
                            "level": 1
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `${cvmessage}`,
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    type: 'mrkdwn',
                                    text: `${/*is_priv?":ms-warning: *this is a private channel/dm, results may be super buggy and/or not accurate at all* ":*/""}results are not 100% accurate, especially on short/single-line messages or messages with no formatting.
identified categories: ${categories?.length!==0?categories:"none"}
ratelimits: ${maxmin} per minute`,
                                }
                            ]}
                    ]
                },
            });}catch(e){
                if(e.data?.error=='not_found'){
                }else{
                    console.error(e)
                }
            }


    } catch (error) {
        logger.error(error);
    }
};
const shortcutTwoCallback = async ({ shortcut, ack, client, logger }) => {
    try {
        const { message, user, trigger_id } = shortcut;
        const target=message.user
        await ack()
        if(!makerequest(user.id,aweight)){
            try{
                await client.views.open({
                    trigger_id,
                    view: {
                        type: 'modal',
                        callback_id: 'sample_view_id',
                        title: {
                            type: 'plain_text',
                            text: 'ratelimit reached',
                        },
                        blocks: [
                            /*{
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "please wait",
                            "emoji": true
                        },
                        "level": 1
                    },*/
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: `you have reached the ratelimit. please try again in 1 minute.`,
                                }
                            },
                            {
                                "type": "context",
                                "elements": [
                                    {
                                        type: 'mrkdwn',
                                        text: `ratelimit is ${amin} per minute for analyses`,
                                    }
                                ]}
                        ]
                    },
                });return}catch(e){
                    if(e.data?.error=='not_found'){
                    }else{
                        console.error(e)
                    }
                }

        }
        console.log({target,user})
        var result=0
        try{
            result = await client.views.open({
                trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'sample_view_id',
                    title: {
                        type: 'plain_text',
                        text: 'please wait...',
                    },
                    blocks: [
                        /*{
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "please wait",
                            "emoji": true
                        },
                        "level": 1
                    },*/
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `analyzing user platforms...`,
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    type: 'mrkdwn',
                                    text: `this requires calling the coolton abuse API on all messages of this user in the past 3 months, so it may take some time. ratelimits: ${maxmin/aweight} per minute for analyses`,
                                }
                            ]}
                    ]
                },
            })}catch(e){
                if(e.data?.error=='not_found'){
                }else{
                    console.error(e); return
                }
            }
        const hits= await sample(target,client)
        var nones=0
        var flags=0
        var watches=0
        const delaypromise= delay(500+Math.random()*1000) //for now
        const rbody={"calls":hits.map((permalink)=>{return {permalink}})}
        const fetchpromise= fetch(`${process.env.ANTIBOT_BASE_URL}`,{
                method:"POST",headers: { Authorization: `Bearer ${process.env.ANTIBOT_API_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify(rbody)
            })
        const rjson=await (await fetchpromise).json();
        console.log("===RBODY===",JSON.stringify(rbody,null,2),"===rjson===",JSON.stringify(rjson,null,2))
        rjson.responses.forEach((res,i)=>{
            const {verdict,categories}=res
            switch(verdict){
                case 'none': nones++; break
                case 'flag': flags++; break
                case 'watch':watches++;break
                default:
                    console.log("unknown verdict ", {verdict, categories, res, "hit":hits[i] })
            }

        })
        await Promise.all([delaypromise, fetchpromise])
        const total=nones+flags+watches
        try{
            await client.views.update({
                view_id: result.view.id,
                view: {
                    type: 'modal',
                    callback_id: 'sample_view_id',
                    title: {
                        type: 'plain_text',
                        text: 'results',
                    },
                    blocks: [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": "Verdict (from coolton abuse API):",
                                "emoji": true
                            },
                            "level": 1
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*:msn-pc: Desktop/Web/Android:* ${(100*(nones/total)).toFixed(4)}%
*:msn-mobile-phone: iOS:* ${(100*(watches/total)).toFixed(4)}%
*:msn-robot-3d-clean-2: Automated/Unofficial clients:*  ${(100*(flags/total)).toFixed(4)}%
`,
                            }
                        },
                        {
                            "type": "context",
                            "elements": [
                                {
                                    type: 'mrkdwn',
                                    text: `sampled out of ${total} messages from the last 90 days.
results are not 100% accurate, especially on short/single-line messages or messages with no formatting.
ratelimits: ${maxmin/aweight} per minute`,
                                }
                            ]}
                    ]
                },
            });}catch(e){
                if(e.data?.error=='not_found'){
                }else{
                    console.error(e)
                }
            }



    }catch(e){logger.error(e)}
}
export { sampleShortcutCallback, shortcutTwoCallback };
