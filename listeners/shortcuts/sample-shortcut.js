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
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "please wait",
                            "emoji": true
                        },
                        "level": 1
                    },
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
        await delay(500+Math.random()*1000) //to prevent yall from reverse engineering the api, yes the dist is different in prod
        await client.views.update({
            view_id: result.view.id,
            view: {
                type: 'modal',
                callback_id: 'sample_view_id',
                title: {
                    type: 'plain_text',
                    text: 'done!',
                },
                blocks: [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "results",
                            "emoji": true
                        },
                        "level": 1
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `<insert placeholder results here>`,
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                        {
                            type: 'mrkdwn',
                            text: `results are not 100% accurate, especially on short/single-line messages or messages with no formatting.`,
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
