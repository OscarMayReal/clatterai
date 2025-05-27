import {ClatterUserbot, ClatterChannelConnector} from 'clatter_userbot_api';

var bot = new ClatterUserbot({
    token: process.env.CLATTER_BOT_TOKEN
});

var generateResponse = async (messages) => {
    var req = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.TOGETHER_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'model': process.env.TOGETHER_AI_MODEL,
            'messages': messages,
            'stream': false
        })
    });
    var res = await req.json();
    console.log(res);
    return res;
}

var watchedthreads = [];

bot.CheckToken().then(res => {
    if(res) {
        bot.getWorkspaces().then(res => {
            bot.selectWorkspace(process.env.WORKSPACE_ID).then(res => {
                bot.listChannels().then(async res => {
                    console.log(res);
                    var channel = new ClatterChannelConnector({
                        channelId: res.find(channel => channel.name == 'ai').id,
                        bot: bot,
                        onReady: () => {
                            console.log('Ready');
                        },
                        onMessage: async (message) => {
                            if(message.content == "!ai start") {
                                channel.sendMessage(message.sendername + " started an AI chat: reply in this thread to chat with the AI, or send !ai stop in this thread to stop the chat");
                            } else if(message.content == "!ai stop" && watchedthreads.includes(message.parentmessageid)) {
                                watchedthreads.splice(watchedthreads.indexOf(message.parentmessageid), 1);
                                console.log("Stopped watching thread " + message.parentmessageid);
                                channel.sendThreadMessage({message: "AI chat stopped", parentmessageid: message.parentmessageid});
                            } else if(watchedthreads.includes(message.parentmessageid)) {
                                channel.sendThreadMessage({message: "Generating response...", parentmessageid: message.parentmessageid});
                                var messages = await channel.getThreadMessages(message.parentmessageid);
                                console.log(messages);
                                console.log(message.parentmessageid);
                                var aimessages = []
                                messages.forEach(msg => {
                                    if (msg.content != "Generating response...") {
                                        if(msg.userId != bot.userId) {
                                            aimessages.push({
                                                role: "user",
                                                content: msg.content
                                            });
                                        } else {
                                            aimessages.push({
                                                role: "assistant",
                                                content: msg.content
                                            });
                                        }
                                    }
                                });
                                var response = await generateResponse(aimessages);
                                channel.sendThreadMessage({message: response.choices[0].message.content, parentmessageid: message.parentmessageid});
                            }
                        },
                        onSelfMessage: (message) => {
                            if(message.content.includes("started an AI chat: reply in this thread to chat with the AI, or send !ai stop in this thread to stop the chat")) {
                                watchedthreads.push(message.id);
                                console.log("Started watching thread " + message.id);
                            }
                        }
                    });
                });
            });
        });
    } else {
        console.log('Token is invalid');
    }
});