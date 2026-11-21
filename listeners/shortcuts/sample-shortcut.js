import { setTimeout as delay } from 'timers/promises';
const maxmin=5;
var ratemin=new Map() // user id: [minute, prev, now]
var flag=false
function makerequest(uid){
    while(flag){}
    flag=true
    const ctime= Date.now()/1000;
    const cmin= Math.floor(ctime/60)
    const portion=ctime/60-cmin
    var ratec=[...(ratemin.get(uid)||[-1,0,0])]
    const xmin= ratec[0]
    do{
        if(cmin>xmin+1){
            //always allowed
            ratec=[cmin,0,1]
            break;
        }
        if(cmin===xmin+1){
            ratec=[cmin,ratec[2],1]
            break;
        }
        if(cmin===xmin){
            ratec=[cmin,ratec[1],ratec[2]+1]
        }
    }while(false)
    const requests=ratec[1]*(1-portion)+ratec[2]
    flag=false
    try{
        if (requests>maxmin){
            return false
        }else{
            ratemin.set(uid,ratec)
            return true
        }
    }finally{

    }
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
                                    text: `you have reached the ratelimit. please try again later.`,
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
                                    text: `this may take a while, hang on`,
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
        var fetchpromise= fetch("https://2390.proxy.tanjim.org/antibot/check",{
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
                                    text: `${is_priv?":ms-warning: *this is a private channel/dm, results may be super buggy and/or not accurate at all* ":""}results are not 100% accurate, especially on short/single-line messages or messages with no formatting.\nidentified categories: ${categories?categories:"none"}`,
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

export { sampleShortcutCallback };
