# slack msg fingerprinter!
this is a bot that uses the Coolton Abuse API to try to find out which slack client a message was sent from.

## how to use
- click "more actions"/`⋮` -> "Connect to Apps" -> "More Message Shortcuts" -> search "check message client" -> click the thing 
![image](https://cdn.hackclub.com/01a1fec8-9010-7d90-8ba1-4c2909d082d1/7x70b3j.png)
- wait for the thing to complete
- you should see something like this. 
![image](https://user-cdn.hackclub-assets.com/01a1fec8-9245-7583-b91d-4625bf829f4f/xxmtem8.png)


## how to host

1. get an API key for the Coolton Abuse API
2. using `manifest.json`, install your slack app ([https://api.slack.com/apps](https://api.slack.com/apps) -> "Create New App" -> "Paste a Manifest"). generate a `xapp-` token for socket mode (if you dont want to deal w/ request URLs. if you do then you already know what to do).
3. do `cp .env.example .env` then open `.env` with your favourite editor and fill in the details
4. make sure you have node and npm. do `npm install` and `node app.js` (DONT DO `NODE_ENV=production`). its running now! use your favourite init system to put it as a service if you wish
