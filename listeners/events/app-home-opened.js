const appHomeOpenedCallback = async ({ client, event, logger }) => {
  // Ignore the `app_home_opened` event for anything but the Home tab
  if (event.tab !== 'home') return;

  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: 'home',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
                text: `*hihiii! ^_^ <@${event.user}>*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'uhmmmm idk what to put in the app home',
            },
          },
        ],
      },
    });
  } catch (error) {
    logger.error(error);
  }
};

export { appHomeOpenedCallback };
