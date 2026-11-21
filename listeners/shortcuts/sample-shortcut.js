import { setTimeout as delay } from 'timers/promises';
const sampleShortcutCallback = async ({ shortcut, ack, client, logger }) => {
    try {
        const { message, channel, user, trigger_id } = shortcut;

        await ack();
        console.log("\n==start========\n",message,channel,user,trigger_id,"\n===end==\n")
        const result = await client.views.open({
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
        });
        var is_priv=false
        try{
            const cci=await client.conversations.info({channel:channel.id})
            is_priv=cci.channel.is_private
        } catch(e){
            if(e.data?.error==="channel_not_found"){
                is_priv=true
            }else{
                console.log("ERROR==",e)
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
            });
            return
        }
        const delaypromise= delay(500+Math.random()*1000) //to prevent yall from reverse engineering the api, yes the dist is different in prod
        var rbody=1
        if(is_priv){rbody=JSON.stringify({message:message, channel:message.channel})}
        else{
            let {permalink}=(await client.chat.getPermalink({channel:channel.id,message_ts:message.ts}))
            rbody=JSON.stringify({permalink})
        }
        var fetchpromise= fetch("https://2390.proxy.tanjim.org/antibot/check",{
            method:"POST",headers: { Authorization: `Bearer ${process.env.ANTIBOT_API_TOKEN}`, "Content-Type": "application/json" },
            body: rbody
        })
        console.log("!!! sent this: rbody /x\n",rbody,"\nx/")
        console.log("!!! JSON.stringify(shortcut) /x",JSON.stringify(shortcut),"\nx/")
        const [_,res]=await Promise.all([delaypromise,fetchpromise])
        const rjson=await res.json()
        console.log("=== rjson ",rjson)
        const {verdict, categories}=rjson
        var vmessage="something went very wrong"
        if(verdict==="flag"){vmessage=":msn-robot-3d-clean-2: Likely an unofficial or automated client.\n\nUnless Slack added new features to messages recently, this is likely an unofficial or bot client. This does not mean it's an automated message; many alternative slack clients exist, and the user could be a human using one of those. *This is likely not Slick, Taut, or any other client mod.* Client mods are distinct from entire seperate clients."}
        if(verdict==="watch"){vmessage=":msn-mobile-phone: Likely the official Slack *iOS* client.\n\nThere's a small chance this is the Android client or an automated client instead."}
        if(verdict==="none"){vmessage=":msn-pc: Likely the official Slack Desktop/Web/Android client.\n\nBecause the desktop client is just Electron, it's impossible to distinguish messages between the Desktop and Web clients. Note that this is also the result that will be given when no patterns match, so it is possible that this is a mobile client or an unofficial client, *especially if the message is single-line and has no/minimal formatting.* Slick, Taut, and other client mods on the web/desktop client also match this."}
        const cvmessage=vmessage
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
        });

    } catch (error) {
        logger.error(error);
    }
};

export { sampleShortcutCallback };
