//The imports which are required by the server
const Fastify = require('fastify')
const cors = require('@fastify/cors');
const path = require('node:path');
const fs = require("fs")
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const {
    v4: uuidv4
} = require('uuid');
const os = require("os")
const {
    simpleParser
} = require('mailparser');
const cluster = require('cluster');
require('cluster-shared-memory');



//failed code cleaning tries: 5
//increase if you tried lol




//The code each cluster calls
const createServer = () => {

    const appVersion = "1.0.0,put the update link right here"
    const appNews = "news3,Next update!,This is shown as news in the app :)"

    //create the shared-memory instance
    const mem = require('cluster-shared-memory');



    //Some Inter process messaging
    process.on('message', async (message) => {
        if (message.type) {
            if (message.type === "stats") {
                const ownPid = process.pid;
                var stats = await mem.get("stats");
                stats.clusters[ownPid].stats = returnLocalStats();
                await mem.set("stats", stats);
            } else if (message.type === "message") {
                if (message.aim) {
                    const connection = localClients[message.username];
                    if (connection) {
                        if (message.aim === "stopInviting") {
                            await stopInviting(connection);
                            connection.inTrade = true;
                            connection.tradeUuid = message.tradeUuid;
                        } else if (message.aim === "joinRt") {
                            connection.inTrade = true;
                            connection.tradeUuid = message.tradeUuid;
                        }
                    } else {
                        console.log(`No local client found for username: ${message.username}`);
                    }
                }
            }
        }

        if (message.finished) {
            const connection = localClients[message.username];
            if (connection) {
                setTimeout(() => {
                    connection.inTrade = false;
                    connection.tradeUuid = "";
                }, 1000);
            } else {
                console.log(`No local client found for username: ${message.username}`);
            }
        }


        if (message.username) {
            const connection = localClients[message.username];
            if (connection) {
                if (message.content && message.content.type === "leave") {
                    connection.inTrade = false;
                    connection.tradeUuid = "";
                }
                connection.send(message.content);
            } else {
                console.log("Something ain't working with cluster message forwarding");
            }
        } else {}
    });




    //The actual fastify server which runs in each cluster

    fastify = Fastify({
        logger: false
    })
    fastify.register(cors, {}) //we dont really need cors here
    fastify.register(require('@fastify/websocket'))



    //This is a private endpoint to retreive stats for an admin dashboard or a discord bot
    fastify.get("/backend/usageStats", async (req, rep) => {
        const stats = await mem.get("historicalStats");
        return stats.slice(-150);
    })




    //some prehooking ratelimits per ip
    fastify.addHook('onRequest', async (request, reply) => {
        const ip = request.headers['cf-connecting-ip']
        const currentTime = Date.now();
        var rateLimitStore = await mem.get("rateLimitStore")

        const requestInfo = rateLimitStore[ip] || {
            count: 0,
            firstRequestTime: currentTime
        };
        if (currentTime - requestInfo.firstRequestTime > TIME_WINDOW) {
            rateLimitStore[ip] = {
                count: 1,
                firstRequestTime: currentTime
            }
        } else {
            requestInfo.count += 1;
            rateLimitStore[ip] = requestInfo
        }
        await mem.set("rateLimitStore", rateLimitStore)
        if (requestInfo.count > RATE_LIMIT) {
            return "no"
        }
    });




    //local variables for webhooks, i used discord but any are fine.
    const accWh = "https://discord.com/api/webhooks/"
    const invWh = "https://discord.com/api/webhooks/"
    const tradeWh = "https://discord.com/api/webhooks/"
    const errorWh = "https://discord.com/api/webhooks/"
    const susWh = "https://discord.com/api/webhooks/"
    const secWh = "https://discord.com/api/webhooks/"

    //The accounts.json (dont blame me for saving user data in a json)
    const accPath = 'accounts.json';

    //The very secret jwt key, dont ever leak it!
    const secretKey = 'amazingJwtKey';

    //Some more lcoal variables for clients/ratelimits
    const RATE_LIMIT = 15;
    const TIME_WINDOW = 60 * 1000;
    const localClients = {}




    //This function checks, if 2 persons want to trade in random trading and if yes, matches them
    async function checkForRt(queueName) {
        const tradeQueue = await mem.get(queueName)
        if (tradeQueue.length > 1) {
            const entry1 = tradeQueue.shift()
            const entry2 = tradeQueue.shift()
            await mem.set(queueName, tradeQueue)
            webhook(tradeWh, "Matched " + entry1.username + " and " + entry2.username + " in rt in year " + queueName.split("Queue")[0])
            const clients = await mem.get("clients")
            const pidUser1 = clients[entry1.username]
            const tradeUuid = uuidv4()

            process.send({
                "type": "message",
                "pid": pidUser1,
                "aim": "joinRt",
                "username": entry1.username,
                "tradeUuid": tradeUuid
            })

            const person1 = entry1.username
            const person1Wl = entry1.wishlist
            const person2 = entry2.username
            const person2Wl = entry2.wishlist
            const connection = localClients[person2]
            const year = entry1.year
            const person1Avatar = entry1.avatar
            const person2Avatar = entry2.avatar
            connection.inTrade = true
            connection.tradeUuid = tradeUuid
            const tradeObj = {
                "tradeUuid": tradeUuid,
                "username1": person1,
                "username2": person2,
                "username1Wl": person1Wl,
                "username2Wl": person2Wl,
                "year": year,
                "username1Avatar": person1Avatar,
                "username2Avatar": person2Avatar,
                "pid1": pidUser1,
                "pid2": process.pid,
                "username1Coins": 0,
                "username2Coins": 0,
                "username1Ready": false,
                "username2Ready": false,
                "username1Cards": [],
                "username2Cards": []
            }

            const trades = await mem.get("trades")
            trades[tradeUuid] = tradeObj
            await mem.set("trades", trades)

            connection.send(JSON.stringify({
                "tradeUuid": tradeUuid,
                "type": "connect",
                "year": year,
                "ownUsername": person2,
                "otherWishlist": person1Wl,
                "otherUsername": person1,
                "ownAvatar": person2Avatar,
                "otherAvatar": person1Avatar,
            }))

            process.send({
                "pid": pidUser1,
                "type": "message",
                "username": person1,
                "content": JSON.stringify({
                    "type": "connect",
                    "ownPid": pidUser1,
                    "otherPid": process.pid,
                    "tradeUuid": tradeUuid,
                    "year": year,
                    "otherWishlist": person2Wl,
                    "ownUsername": person1,
                    "otherUsername": person2,
                    "ownAvatar": person1Avatar,
                    "otherAvatar": person2Avatar
                })
            })
        }
    }


    //here users gets added to the queue and the check is performed
    async function addQueue(username, year, avatar, wishlist) {
        const combined = JSON.stringify(year) + "Queue"
        const yearQueue = await mem.get(combined)

        const entry = yearQueue.find(entry => entry.username === username);
        if (entry) {} else {
            yearQueue.push({
                username,
                year,
                avatar,
                wishlist
            })
            await mem.set(combined, yearQueue)
            await checkForRt(combined)
        }
    }


    //removing from queue
    async function removeQueue(username, year) {
        const combined = JSON.stringify(year) + "Queue"
        const yearQueue = await mem.get(combined)
        const entry = yearQueue.find(entry => entry.username === username);
        if (entry) {
            yearQueue.splice(yearQueue.indexOf(entry), 1)
            await mem.set(combined, yearQueue)
        }
    }




    async function handlePossibleTradeEnd(connection, tradeUuid) {
        const allTrades = await mem.get("trades")
        const userTrade = allTrades[tradeUuid]
        if (userTrade.username1Ready == true && userTrade.username2Ready == true) {
            const stats = await mem.get("usageStats");
            stats.totalCoinsTraded += (userTrade.username1Coins + userTrade.username2Coins);
            stats.totalCardsTraded += (userTrade.username1Cards.length + userTrade.username2Cards.length);
            stats.successfulTrades += 1;
            await mem.set("usageStats", stats);


            const conName = connection.tradingName


            if (conName == userTrade.username1) {
                connection.send(JSON.stringify({
                    "type": "tradeResult",
                    "coinsToGive": userTrade.username1Coins,
                    "coinsToGet": userTrade.username2Coins,
                    "cardsToGive": userTrade.username1Cards.map(card => card.split(',')[0]),
                    "cardsToGet": userTrade.username2Cards.map(card => card.split(',')[0]),
                    "cheatsDetected": false //didnt add a cheat logic yet
                }))

                const processMsg = {
                    "type": "tradeResult",
                    "coinsToGive": userTrade.username2Coins,
                    "coinsToGet": userTrade.username1Coins,
                    "cardsToGive": userTrade.username2Cards.map(card => card.split(',')[0]),
                    "cardsToGet": userTrade.username1Cards.map(card => card.split(',')[0]),
                    "cheatsDetected": false
                }

                const clients = await mem.get("clients")

                const pidLol = clients[userTrade.username2]

                process.send({
                    "type": "message",
                    "finished": true,
                    "pid": pidLol,
                    "username": userTrade.username2,
                    "content": JSON.stringify(processMsg)
                })




            } else if (conName == userTrade.username2) {
                connection.send(JSON.stringify({
                    "type": "tradeResult",
                    "coinsToGive": userTrade.username2Coins,
                    "coinsToGet": userTrade.username1Coins,
                    "cardsToGive": userTrade.username2Cards.map(card => card.split(',')[0]),
                    "cardsToGet": userTrade.username1Cards.map(card => card.split(',')[0]),
                    "cheatsDetected": false
                }))

                const processMsg = {
                    "type": "tradeResult",
                    "coinsToGive": userTrade.username1Coins,
                    "coinsToGet": userTrade.username2Coins,
                    "cardsToGive": userTrade.username1Cards.map(card => card.split(',')[0]),
                    "cardsToGet": userTrade.username2Cards.map(card => card.split(',')[0]),
                    "cheatsDetected": false
                }

                const clients = await mem.get("clients")

                const pidLol = clients[userTrade.username1]


                process.send({
                    "type": "message",
                    "pid": pidLol,
                    "username": userTrade.username1,
                    "finished": true,
                    "content": JSON.stringify(processMsg)
                })

            }


            const message = `A trade between **${userTrade.username1}** and **${userTrade.username2}** in year **${userTrade.year}** finished!
${userTrade.username1} gave **${userTrade.username1Coins} coins** and **${JSON.stringify(userTrade.username1Cards)} cards**
${userTrade.username2} gave **${userTrade.username2Coins} coins** and **${JSON.stringify(userTrade.username2Cards)} cards**`;

            webhook(tradeWh, message);




            setTimeout(async function() {
                var clearTrades = await mem.get("trades")
                delete clearTrades[tradeUuid]
                await mem.set("trades", clearTrades)
                connection.inTrade = false
                connection.tradeUuid = ""
            }, 1000)



        } else {}
    }



    //when accepting an invite
    async function handleInvitesJoin(connection) {
        if (connection.auth == true) {
            const invites = await mem.get("invites")
            const inviteSpot = invites[connection.tradingName]
            if (inviteSpot && inviteSpot.length > 0) {
                for (let invite of inviteSpot) {
                    //invite.getConnection = connection
                    connection.send(JSON.stringify({
                        "type": "inviteAdd",
                        "to": invite.to,
                        "from": invite.from,
                        "year": invite.year,
                        "avatarFrom": invite.avatarFrom,
                        "inviteId": invite.uuid
                    }))
                }
            }
        }
    }



    async function stopInviting(connection) {
        if (connection == "mawosbot") {
            const invites = await mem.get("invites")
            const inviteSpot = invites["mawosbot"]
            if (inviteSpot && inviteSpot.length > 0) {
                for (let invite of inviteSpot) {
                    if (invite.from == "mawosbot") {
                        var index = inviteSpot.indexOf(invite)
                        if (index != -1) {
                            inviteSpot.splice(index, 1)
                            await mem.set("invites", invites)
                        }
                    }
                }
            }


        } else {
            if (connection.auth == true && connection.inviting == true && connection.invitingName != "") {
                const traderName = connection.tradingName
                const inviteName = connection.invitingName
                const invites = await mem.get("invites")
                const inviteSpot = invites[inviteName]
                if (inviteSpot && inviteSpot.length > 0) {
                    for (let invite of inviteSpot) {
                        if (invite.from == traderName) {
                            var index = inviteSpot.indexOf(invite)
                            if (index != -1) {
                                inviteSpot.splice(index, 1)
                                await mem.set("invites", invites)
                            }
                            const clients = await mem.get("clients")
                            const stopInvClientPid = clients[invite.to]
                            if (stopInvClientPid) {
                                process.send({
                                    "type": "message",
                                    "pid": stopInvClientPid,
                                    "username": invite.to,
                                    "content": JSON.stringify({
                                        "type": "inviteRemove",
                                        "from": invite.from,
                                        "year": invite.year,
                                        "inviteId": invite.uuid,
                                        "avatarFrom": invite.avatarFrom
                                    })
                                })
                            }
                            break
                        }
                    }
                } else {
                    webhook(errorWh, "stopped inviting but wasnt inviting?! -> " + connection.tradingName)
                    banUser(connection, " stopped inviting without invite???")

                }
                connection.inviting = false
                connection.invitingName = ""
            } else {
                banUser(connection, " stopped inviting without auth???")
            }
        }
    }




    //How to ban users via connection or username
    function banUser(connection, reason) {
        if (connection.decoded) {
            const accounts = readAccountsFile()

            const account = accounts.find(account => account.uid === connection.decoded.uid);

            if (account) {

                account.isLocked = true

                writeAccountsFile(accounts)

                connection.connection.send(JSON.stringify({
                    "type": "ban"
                }))
                webhook(secWh, account.username + " got banned because: " + reason)
            }
        } else {
            const accounts = readAccountsFile()

            const account = accounts.find(account => account.tradingName === connection.tradingName);

            if (account) {

                account.isLocked = true

                writeAccountsFile(accounts)
                connection.send(JSON.stringify({
                    "type": "ban"
                }))
            } else {

                webhook(secWh, "account to ban wasnt found... " + connection.tradingName + " -> " + reason)

            }
            webhook(secWh, connection.tradingName + " got banned because: " + reason)
        }


    }




    //after an invite has been sent
    async function handleInvite(invite) {
        const clients = await mem.get("clients")
        if (localClients[invite.from].inviting == true || localClients[invite.from].invitingName != "") {
            banUser(localClients[invite.from], "he/she invited " + invite.to + " even though he was still inviting " + localClients[invite.from].invitingName)
        } else {
            webhook(invWh, "**" + invite.from + "** sent inv to **" + invite.to + "**")

            const pidLol = clients[invite.to]
            const person = invite.to
            if (pidLol) {
                process.send({
                    "type": "message",
                    "pid": pidLol,
                    "username": person,
                    "content": JSON.stringify({
                        "type": "inviteAdd",
                        "to": invite.to,
                        "from": invite.from,
                        "year": invite.year,
                        "avatarFrom": invite.avatarFrom,
                        "inviteId": invite.uuid
                    })
                })
            }
            localClients[invite.from].inviting = true
            localClients[invite.from].invitingName = invite.to
            var invites = await mem.get("invites")
            if (!invites[invite.to]) {
                invites[invite.to] = []
                await mem.set("invites", invites)
            }
            invites = await mem.get("invites")
            invites[invite.to].push(invite)
            await mem.set("invites", invites)
        }
    }


    //If someone leaves the trade
    async function handleLeave(tradeUuid, connection) {
        try {
            if (connection.inTrade == true && connection.tradeUuid) {
                var allTrades = await mem.get("trades")
                const userTrade = allTrades[tradeUuid]
                connection.inTrade = false
                connection.tradeUuid = ""
                var socketMessage = {
                    "type": "left"
                }
                const clients = await mem.get("clients")
                if (userTrade.username1 == connection.tradingName) {
                    const userToSend = userTrade.username2
                    const pidLol = clients[userToSend]
                    process.send({
                        "type": "message",
                        "pid": pidLol,
                        "username": userToSend,
                        "content": JSON.stringify(socketMessage)
                    })
                    delete allTrades[tradeUuid]
                    await mem.set("trades", allTrades)
                } else if (userTrade.username2 == connection.tradingName) {
                    const userToSend = userTrade.username1
                    const pidLol = clients[userToSend]
                    process.send({
                        "type": "message",
                        "pid": pidLol,
                        "username": userToSend,
                        "content": JSON.stringify(socketMessage)
                    })
                    delete allTrades[tradeUuid]
                    await mem.set("trades", allTrades)
                } else {
                    console.log("cant find the trade user")
                }
            } else {}
        } catch (e) {}
    }




    //Endpoints which are called by the app:

    fastify.register(async function(fastify) {
        fastify.get('/client/ws', {
            websocket: true
        }, async (connection, req) => {
            if (req.headers["user-agent"] != "okhttp/4.9.2" || req.headers["sec-websocket-extensions"].includes("client_max_window_bits")) { //some anti bot strategies :)
                connection.send('try harder')
                setTimeout(function() {
                    connection.close()
                }, 500)
                webhook(susWh, "someone tried connecting but didnt use the app")
                return
            }

            const lockdown = await mem.get("lockdown")
            const tradingLocked = await mem.get("tradingLocked")

            if (lockdown == true || tradingLocked == true) {
                console.log("Disconnected someone since locked")
                setTimeout(function() {
                    connection.close()
                }, 1000)
                return

            }


            connection.auth = false
            connection.uuid = uuidv4()


            connection.on('message', async (message) => {
                message = message.toString()
                console.log(message)
                try {
                    var msg
                    try {

                        msg = JSON.parse(message)
                    } catch {
                        return
                    }

                    if (msg.type == "joinRt") {
                        if (connection.auth == true /*&& connection.inTrade == false */ && connection.inviting == false && connection.invitingName == "") {
                            if (msg.year == 16 || msg.year == 17 || msg.year == 18 || msg.year == 19 || msg.year == 20 || msg.year == 21 || msg.year == 22 || msg.year == 23) {


                                if (msg.wishlist) {
                                    if (msg.wishlist.length <= 30) {

                                        connection.year = msg.year

                                        await addQueue(connection.tradingName, msg.year, connection.avatar, msg.wishlist)

                                    } else {
                                        banUser(connection, "Wanted to join rt with more than 30 wl cards")
                                    }
                                } else {}

                            } else {
                                banUser(connection, "Wanted to join rt in year " + msg.year)
                            }

                        } else {
                            if (connection.auth == false) {
                                connection.send(JSON.stringify({
                                    "type": "ban"
                                }))
                                return
                            } else {
                                banUser(connection, "Tried to join random trading even though still in a trade or inviting")
                            }
                        }


                    } else if (msg.type == "cancelRt") {
                        if (connection.auth == true && connection.inTrade == false && connection.inviting == false && connection.invitingName == "") {
                            await removeQueue(connection.tradingName, connection.year)


                        }



                    } else if (msg.type == "searchCard") {
                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {

                            const tradeUuid = connection.tradeUuid
                            var allTrades = await mem.get("trades")
                            const userTrade = allTrades[tradeUuid]
                            var socketMessage = {
                                "type": "searchCard",
                                "slot": msg.slot
                            }
                            const clients = await mem.get("clients")
                            if (userTrade.username1 == connection.tradingName) {
                                const userToSend = userTrade.username2
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else if (userTrade.username2 == connection.tradingName) {
                                const userToSend = userTrade.username1
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else {
                                console.log("cant find the trade user")
                            }
                        } else {
                            //      banUser(connection, "Tried to search a card even though not in a trade or still inviting")          
                        }




                    } else if (msg.type == "stopSearchCard") {
                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {

                            const tradeUuid = connection.tradeUuid
                            var allTrades = await mem.get("trades")
                            const userTrade = allTrades[tradeUuid]
                            var socketMessage = {
                                "type": "stopSearchCard",
                                "slot": msg.slot
                            }
                            const clients = await mem.get("clients")
                            if (userTrade.username1 == connection.tradingName) {
                                const userToSend = userTrade.username2
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else if (userTrade.username2 == connection.tradingName) {
                                const userToSend = userTrade.username1
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else {
                                console.log("cant find the trade user")
                            }
                        } else {
                            //     banUser(connection, "Tried to stop searching a card even though not in a trade or still inviting")          
                        }




                    } else if (msg.type == "startCoinsSearch") {
                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {

                            const tradeUuid = connection.tradeUuid
                            var allTrades = await mem.get("trades")
                            const userTrade = allTrades[tradeUuid]
                            var socketMessage = {
                                "type": "startCoinsSearch"
                            }
                            const clients = await mem.get("clients")
                            if (userTrade.username1 == connection.tradingName) {
                                const userToSend = userTrade.username2
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else if (userTrade.username2 == connection.tradingName) {
                                const userToSend = userTrade.username1
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else {
                                console.log("cant find the trade user")
                            }
                        } else {
                            banUser(connection, "Tried to search a card even though not in a trade or still inviting")
                        }




                    } else if (msg.type == "leave") {
                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {
                            const tradeUuid = connection.tradeUuid
                            await handleLeave(tradeUuid, connection)
                        } else {
                            //      banUser(connection, "Tried to leave even though not in a trade or still inviting")          
                        }



                    } else if (msg.type == "stopAccept") {
                        if (connection.auth == true && connection.inTrade == true && connection.tradeUuid != "" && connection.inviting == false && connection.invitingName == "") {
                            const tradeUuid = connection.tradeUuid
                            var allTrades = await mem.get("trades")
                            const userTrade = allTrades[tradeUuid]
                            var socketMessage = {
                                "type": "otherStopAccept"
                            }
                            const clients = await mem.get("clients")
                            if (userTrade.username1 == connection.tradingName) {
                                allTrades[tradeUuid].username1Ready = false
                                await mem.set("trades", allTrades)
                                const userToSend = userTrade.username2
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else if (userTrade.username2 == connection.tradingName) {
                                allTrades[tradeUuid].username2Ready = false
                                await mem.set("trades", allTrades)
                                const userToSend = userTrade.username1
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else {
                                console.log("cant find the trade user")
                            }


                        } else {
                            banUser(connection, "Tried to stop accept even though not in a trade or still inviting")
                        }




                    } else if (msg.type == "acceptTrade") {
                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {
                            const tradeUuid = connection.tradeUuid
                            var allTrades = await mem.get("trades")
                            const userTrade = allTrades[tradeUuid]
                            var socketMessage = {
                                "type": "otherAccept"
                            }
                            const clients = await mem.get("clients")
                            if (userTrade.username1 == connection.tradingName) {
                                allTrades[tradeUuid].username1Ready = true
                                await mem.set("trades", allTrades)
                                const userToSend = userTrade.username2
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else if (userTrade.username2 == connection.tradingName) {
                                allTrades[tradeUuid].username2Ready = true
                                await mem.set("trades", allTrades)
                                const userToSend = userTrade.username1
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else {
                                console.log("cant find the trade user")
                            }

                            await handlePossibleTradeEnd(connection, tradeUuid)

                        } else {
                            banUser(connection, "Tried to accept even though not in a trade or still inviting")
                        }




                    } else if (msg.type == "removeCard") {


                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {
                            msg.tradeUuid = connection.tradeUuid
                            const slot = msg.slot
                            const allTrades = await mem.get("trades")
                            const userTrade = allTrades[msg.tradeUuid]
                            const connectionName = connection.tradingName
                            const cardId = msg.cardId
                            const socketMessage = {
                                "type": "updateRemoveCard",
                                "slot": slot
                            }
                            const clients = await mem.get("clients")
                            if (connectionName == userTrade.username1) {
                                allTrades[msg.tradeUuid].username1Cards.splice(allTrades[msg.tradeUuid].username1Cards.indexOf(cardId + "," + slot), 1)
                                await mem.set("trades", allTrades)

                                const userToSend = userTrade.username2
                                const pidLol = clients[userToSend]

                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else if (connectionName == userTrade.username2) {
                                allTrades[msg.tradeUuid].username2Cards.splice(allTrades[msg.tradeUuid].username2Cards.indexOf(cardId + "," + slot), 1)
                                await mem.set("trades", allTrades)
                                const userToSend = userTrade.username1
                                const pidLol = clients[userToSend]
                                process.send({
                                    "type": "message",
                                    "pid": pidLol,
                                    "username": userToSend,
                                    "content": JSON.stringify(socketMessage)
                                })
                            } else {}

                        } else {
                            banUser(connection, "tried setting a card even though not in a trade or still inviting")
                        }




                    } else if (msg.type == "setCard") {
                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {
                            msg.tradeUuid = connection.tradeUuid
                            const slot = msg.slot
                            const cardId = msg.cardId
                            const allTrades = await mem.get("trades")
                            const userTrade = allTrades[msg.tradeUuid]
                            const connectionName = connection.tradingName
                            const socketMessage = {
                                "type": "updateCards",
                                "cardId": cardId,
                                "slot": slot
                            }
                            const clients = await mem.get("clients")
                            if (connectionName == userTrade.username1) {
                                if (userTrade.username1Cards.some(element => element.split(',')[0] === cardId)) {
                                    banUser(connection, "set the same card 2 times lol")
                                    connection.close()
                                } else {
                                    if (userTrade.username1Cards.length == 0 || userTrade.username1Cards.length == 1 || userTrade.username1Cards.length == 2) {


                                        allTrades[msg.tradeUuid].username1Cards.push(cardId + "," + slot)
                                        await mem.set("trades", allTrades)

                                        const userToSend = userTrade.username2
                                        const pidLol = clients[userToSend]

                                        process.send({
                                            "type": "message",
                                            "pid": pidLol,
                                            "username": userToSend,
                                            "content": JSON.stringify(socketMessage)
                                        })


                                    } else {}
                                }

                            } else if (connectionName == userTrade.username2) {
                                if (userTrade.username2Cards.some(element => element.split(',')[0] === cardId)) {
                                    banUser(connection, "set the same card 2 times lol")
                                    connection.close()
                                } else {
                                    if (userTrade.username2Cards.length == 0 || userTrade.username2Cards.length == 1 || userTrade.username2Cards.length == 2) {

                                        allTrades[msg.tradeUuid].username2Cards.push(cardId + "," + slot)
                                        await mem.set("trades", allTrades)
                                        const userToSend = userTrade.username1
                                        const pidLol = clients[userToSend]

                                        process.send({
                                            "type": "message",
                                            "pid": pidLol,
                                            "username": userToSend,
                                            "content": JSON.stringify(socketMessage)
                                        })
                                    } else {}
                                }
                            } else {}

                        } else {
                            banUser(connection, "tried setting a card even though not in a trade or still inviting")
                        }




                    } else if (msg.type == "setCoins") {
                        if (connection.auth == true && connection.inTrade == true && connection.inviting == false && connection.invitingName == "") {
                            msg.tradeUuid = connection.tradeUuid
                            if (msg.amount == "") {
                                msg.amount = "0"
                            }
                            const amount = parseInt(msg.amount)
                            if (amount > 200000 || 0 > amount) {
                                banUser(connection, "set more than 200.000 or less than 0 coins: " + amount)
                            } else {
                                var allTrades = await mem.get("trades")
                                const userTrade = allTrades[msg.tradeUuid]

                                var socketMessage = {
                                    "type": "updateCoins",
                                    "amount": JSON.stringify(amount)
                                }
                                const clients = await mem.get("clients")
                                if (userTrade.username1 == connection.tradingName) {
                                    allTrades[msg.tradeUuid].username1Coins = amount
                                    await mem.set("trades", allTrades)
                                    const userToSend = userTrade.username2
                                    const pidLol = clients[userToSend]
                                    process.send({
                                        "type": "message",
                                        "pid": pidLol,
                                        "username": userToSend,
                                        "content": JSON.stringify(socketMessage)
                                    })
                                } else if (userTrade.username2 == connection.tradingName) {
                                    allTrades[msg.tradeUuid].username2Coins = amount
                                    await mem.set("trades", allTrades)
                                    const userToSend = userTrade.username1
                                    const pidLol = clients[userToSend]
                                    process.send({
                                        "type": "message",
                                        "pid": pidLol,
                                        "username": userToSend,
                                        "content": JSON.stringify(socketMessage)
                                    })
                                } else {
                                    console.log("cant find the trade user")
                                }
                            }
                        } else {
                            banUser(connection, "Tried to set coins even though not in a trade or still inviting")
                        }




                    } else if (msg.type == "accept") {
                        var invites = await mem.get("invites")
                        if (invites[connection.tradingName]) {
                            const invite = invites[connection.tradingName].find(invite => invite.uuid === msg.inviteUuid && invite.from === msg.inviteInviter);
                            if (connection.auth == true && invite && msg.wishlist && msg.wishlist.length <= 30) {
                                const index = invites[connection.tradingName].indexOf(invite)
                                if (index != -1) {
                                    const clients = await mem.get("clients")
                                    const pidLol = clients[invite.from]
                                    const tradeUuid = uuidv4()

                                    process.send({
                                        "type": "message",
                                        "pid": pidLol,
                                        "aim": "stopInviting",
                                        "username": invite.from,
                                        "tradeUuid": tradeUuid
                                    })
                                    invites = await mem.get("invites")
                                    const person1 = invite.from
                                    const person2 = invite.to
                                    const year = invite.year
                                    const person1Avatar = invite.avatarFrom
                                    const person2Avatar = connection.avatar
                                    const person1Wl = invite.wlFrom
                                    const person2Wl = msg.wishlist
                                    connection.inTrade = true
                                    connection.tradeUuid = tradeUuid
                                    const tradeObj = {
                                        "tradeUuid": tradeUuid,
                                        "username1": person1,
                                        "username2": person2,
                                        "username1Wl": person1Wl,
                                        "username2Wl": person2Wl,
                                        "year": year,
                                        "username1Avatar": person1Avatar,
                                        "username2Avatar": person2Avatar,
                                        "pidFromSender": pidLol,
                                        "pidFromGetter": process.pid,
                                        "username1Coins": 0,
                                        "username2Coins": 0,
                                        "username1Ready": false,
                                        "username2Ready": false,
                                        "username1Cards": [],
                                        "username2Cards": []



                                    }
                                    const trades = await mem.get("trades")
                                    trades[tradeUuid] = tradeObj
                                    await mem.set("trades", trades)




                                    connection.send(JSON.stringify({
                                        "tradeUuid": tradeUuid,
                                        "type": "connect",
                                        "year": year,
                                        "otherWishlist": person1Wl,
                                        "ownUsername": person2,
                                        "otherUsername": person1,
                                        "ownAvatar": person2Avatar,
                                        "otherAvatar": person1Avatar,
                                        "otherPid": pidLol,
                                        "ownPid": process.pid
                                    }))
                                    process.send({
                                        "pid": pidLol,
                                        "type": "message",
                                        "username": person1,
                                        "content": JSON.stringify({
                                            "type": "connect",
                                            "ownPid": pidLol,
                                            "otherWishlist": person2Wl,

                                            "otherPid": process.pid,
                                            "tradeUuid": tradeUuid,
                                            "year": year,
                                            "ownUsername": person1,
                                            "otherUsername": person2,
                                            "ownAvatar": person1Avatar,
                                            "otherAvatar": person2Avatar
                                        })


                                    })
                                } else {}
                            } else {}
                        } else {}


                    } else if (msg.type == "cancelInvite") {
                        if (connection.auth == true && connection.inviting == true && connection.invitingName != "") {
                            await stopInviting(connection)
                        } else {
                            //banUser(connection, "tried to cancel invite but wasnt inviting")
                        }


                    } else if (msg.type == "invite") {
                        if (connection.auth == true) {
                            if (msg.year == 16 || msg.year == 17 || msg.year == 18 || msg.year == 19 || msg.year == 20 || msg.year == 21 || msg.year == 22 || msg.year == 23) {

                                msg.username = msg.username.toLowerCase()
                                if (msg.username.length > 12 || msg.username.length < 4 || msg.username.includes(" ") || !msg.wishlist || msg.wishlist.length > 30) {

                                } else {

                                    var invite = {
                                        "to": msg.username,
                                        "from": connection.tradingName,
                                        "avatarFrom": connection.avatar,
                                        "wlFrom": msg.wishlist,
                                        "year": msg.year,
                                        "uuid": uuidv4()
                                    }
                                    await handleInvite(invite)
                                }
                            } else {
                                banUser(connection, "Sent an invite but the year wasnt 16,17,18,19,20,21,22 or 23, but: " + msg.year)
                                //connection.close()
                            }

                        } else {
                            connection.close()
                            webhook(susWh, "Someone tried invite without beeing logged in in the ws...")
                            banUser(connection, "invite without beeing logged in")
                        }

                    } else if (msg.type == "info") {
                        const tok = msg.token
                        var decoded = {}
                        try {
                            decoded = await jwt.verify(tok, secretKey) //verify the users jwt if it has been edited
                        } catch {
                            webhook(errorWh, tok + " doesnt work as jwt token")
                            connection.send(JSON.stringify({
                                "type": "ban"
                            }))
                            setTimeout(function() {
                                connection.close()
                            }, 500)
                            return
                        }


                        const parsedString = msg.randomString;
                        if (!parsedString) {
                            connection.send("Input is not valid Json unexpected token at position 1.") //show a fake error message for confusion
                            banUser({
                                decoded,
                                connection
                            }, "didnt send a random string!")
                            return
                        }
                        if (parsedString.length != 30) {
                            connection.send("Input is not valid Json unexpected token at position 1.") //and another confusion error
                            banUser({
                                decoded,
                                connection
                            }, "didnt send a random string with length 30! " + parsedString)
                            return
                        }
                        const hashSet = await mem.get("hashSet") //check if their hash has been re-used through network traffic recording

                        if (hashSet[parsedString]) {
                            webhook(susWh, "@everyone someone re-used a hash... " + tok)
                            connection.send("Outdated version. Update please.")
                            banUser({
                                decoded,
                                connection
                            }, "re-using a hash!")
                            return
                        } else {
                            const isValid = verifyHash(msg.hash, tok + "," + msg.randomString) //check if their hash is right

                            if (isValid == false) {
                                webhook(susWh, "Someone provided a wrong hash @everyone that might be a big security issue")
                                connection.send("Invalid ip combination! Ping,version,update ip doesnt correspond connection ip") //some weird confusion error again
                                banUser({
                                    decoded: decoded,
                                    connection: connection
                                }, "invalid hash!")
                                return
                            } else {
                                hashSet[parsedString] = true
                                await mem.set("hashSet", hashSet)

                                const accounts = readAccountsFile()
                                var account = ""
                                for (let i in accounts) {
                                    if (accounts[i].uid == decoded.uid) {
                                        account = accounts[i]
                                        break
                                    }
                                }
                                if (account != "") {
                                    if (account.isLocked == true) {
                                        connection.send(JSON.stringify({
                                            "type": "ban"
                                        }))

                                        webhook(susWh, "A banned account tried login: " + JSON.stringify(account))
                                        connection.close()
                                    } else {
                                        connection.invitingName = ""
                                        connection.tradeUuid = ""
                                        connection.year = 16

                                        connection.inTrade = false
                                        connection.inviting = false
                                        connection.accountUuid = decoded.uuid
                                        connection.tradingName = account.tradingName
                                        connection.avatar = account.avatar
                                        connection.account = account
                                        connection.auth = true
                                        const clients = await mem.get("clients")
                                        clients[account.tradingName] = process.pid
                                        await mem.set("clients", clients)
                                        localClients[account.tradingName] = connection



                                    }

                                    const str = `{"type":"info","tradingName":"${account.tradingName}", "avatar":"${account.avatar}"}`;
                                    connection.send(str)
                                    await handleInvitesJoin(connection)


                                } else {
                                    connection.send(JSON.stringify({
                                        "type": "ban"
                                    }))
                                }
                            }
                        }
                    } else {
                        console.log("received unhandled message: " + JSON.stringify(msg))
                        connection.close()
                    }
                } catch (e) {
                    webhook(errorWh, "error at ws: " + e)
                    throw e
                }
            });


            connection.on('close', async (reason) => {
                if (connection.auth == true) {
                    const clients = await mem.get("clients")
                    delete clients[connection.tradingName]
                    await mem.set("clients", clients)
                    delete localClients[connection.tradingName]
                    if (connection.inviting == false) {} else {
                        await stopInviting(connection)
                    }

                    if (connection.inTrade == true && connection.tradeUuid != "") {
                        await handleLeave(connection.tradeUuid, connection)
                    }

                    await removeQueue(connection.tradingName, connection.year)



                } else {}

            });

            connection.on('error', async (err) => {
                if (connection.auth == true) {
                    const clients = await mem.get("clients")
                    delete clients[connection.tradingName]
                    await mem.set("clients", clients)
                    delete localClients[connection.tradingName]
                    if (connection.inviting == false) {} else {
                        await stopInviting(connection)
                    }

                    if (connection.inTrade == true && connection.tradeUuid != "") {
                        await handleLeave(connection.tradeUuid, connection)
                    }

                    await removeQueue(connection.tradingName, connection.year)
                } else {

                }

                webhook(errorWh, "Websocket error: " + err)
            });
        });
    });




    //Login endpoint for the account
    fastify.post("/client/login", async (req, rep) => {
        try {
            const loginLocked = await mem.get("loginLocked")
            const lockdown = await mem.get("lockdown")
            if (lockdown == true || loginLocked == true) {
                webhook(accWh, req.body.username + " tried login but its currently locked by Mawo")
                return "locked"
            }
            try {
                const body = req.body
                const username = body.username
                const password = body.password
                const accounts = readAccountsFile();
                const account = accounts.find(account => account.username === username && account.password === password);

                if (!account) {
                    const message = `# Failed Login\n**Someone attempted to login, but failed...**\nUsername: ${username}\nPassword: ${password}`;
                    webhook(accWh, message)
                    return "no"

                }

                if (account.isLocked == true) {
                    webhook(accWh, account.username + " tried login but is **banned**!")
                    webhook(susWh, account.username + " tried login but is banned lol!")
                    return "ban"
                }
                const token = jwt.sign({
                    uid: account.uid
                }, secretKey);

                webhook(accWh, "# Login Success\n**" + account.username + " Logged in with this data:**\nUsername: " + account.username + "\nPassword: " + account.password + "\nTrading Name: " + account.tradingName)
                if (account.referer) {
                    const account2 = accounts.find(account2 => account2.tradingName === account.referer);
                    if (account2) {
                        if (account2.invited) {
                            account2.invited += 1
                        } else {
                            account2.invited = 1
                        }

                        writeAccountsFile(accounts)
                    }
                }


                return token
            } catch (e) {
                webhook(errorWh, "An error occourd at login... -> " + e)
                return "error"
            }
        } catch {
            return "no"
        }

    });


    fastify.get("/client/news", async (req, rep) => {
        return appNews
    })


    fastify.get("/client/version", async (req, rep) => {
        return appVersion
    })




    //Bot/Admin endpoints
    fastify.get("/stats/now", async (req, rep) => {

        var stats = await mem.get("stats")
        return stats
    })




    //Endpoint for account creation without much security since handled by a discord bot which only allows one account per discord account which isnt that insecure

    fastify.post("/backend/credentials/create", async (req, rep) => {
        const body = req.body
        const username = body.username
        const password = body.password
        var avatarL = body.avatar
        var referer = undefined
        if (body.referer) {
            referer = body.referer
        }
        if (avatarL == undefined || avatarL == null || avatarL == 0 || avatarL == "None") {
            //    webhook(errorWh, "Gave " + username + " default avatar at their new account")
            avatarL = "https://media.discordapp.net/attachments/1164147365419163738/1203336311721820190/Picsart_24-02-03_09-54-45-461.png?ex=669bc045&is=669a6ec5&hm=a78d03557c85aa6e710b4bab1f1a467a6df39f683b8f4baab4583d1618df75ad&format=webp&quality=lossless&width=657&height=657&.png"
        }


        const base = "https://res.cloudinary.com/dbtvcsajk/image/fetch/w_200,h_200,c_thumb,g_face,r_max/"
        const avatar = base + avatarL
        const tradingName = body.tradingName
        const accounts = readAccountsFile();
        if (accounts.some(account => account.username === username)) {
            webhook(accWh, "Someone wanted a username which is already taken: " + username)
            return rep.status(400).send({
                error: 'Username already exists'
            });
        }

        const uid = uuidv4()
        const discordId = body.discordId
        accounts.push({
            discordId: discordId,
            uid: uid,
            username: username,
            password: password,
            avatar: avatar,
            tradingName: tradingName,
            referer: referer,
            invited: 0,
            isLocked: false
        });

        writeAccountsFile(accounts)
        webhook(accWh, "# Account creation\n**Created a new account:**\nUsername: " + username + "\nPassword: " + password + "\nTrading Name: " + tradingName + "\nreferer: " + referer + "\nUuid: " + uid + "\n" + avatar)
        return "ok"
    })


    //Delete a specific account
    fastify.post("/backend/credentials/delete", async (req, rep) => {
        const body = req.body
        const username = body.username
        const password = body.password
        let accounts = readAccountsFile();
        const accountIndex = accounts.findIndex(account => account.username === username && account.password === password);
        if (accountIndex === -1) {
            return rep.status(400).send({
                error: 'Invalid username or password'
            });
        }
        accounts.splice(accountIndex, 1);
        writeAccountsFile(accounts);
        return "ok"
    })


    //ban users :)
    fastify.get("/backend/ban-user/name/:tradingName/now", async (req, rep) => {
        const accounts = readAccountsFile()

        const account = accounts.find(account => account.tradingName === req.params.tradingName);

        if (account) {

            account.isLocked = true

            writeAccountsFile(accounts)
        }
        webhook(secWh, "banned " + req.params.tradingName)


    })

    fastify.get("/backend/ban-user/:userId/now", async (req, rep) => {
        const accounts = readAccountsFile()
        const account = accounts.find(account => account.discordId === req.params.userId);
        if (account) {
            account.isLocked = true
            writeAccountsFile(accounts)
        } else {
            webhook(secWh, "account to ban wasnt found...")
        }

        webhook(secWh, "<@" + req.params.userId + "> got banned!")
        return "ok"
    })




    //unban users :)
    fastify.get("/backend/unban-user/name/:tradingName/now", async (req, rep) => {
        const accounts = readAccountsFile()

        const account = accounts.find(account => account.tradingName === req.params.tradingName);

        if (account) {

            account.isLocked = false

            writeAccountsFile(accounts)
        }
        webhook(secWh, "unbanned " + req.params.tradingName)


    })


    //retreive users imaginary coins
    fastify.get("/backend/retreive-coins/:userId/now", async (req, rep) => {
        console.log(req.params.userId)
        const accounts = readAccountsFile()
        const account = accounts.find(account => JSON.stringify(account.discordId) === req.params.userId)
        if (account) {
            if (account.invited) {
                console.log(account.invited)
                return account.invited
            } else {
                return 0
            }
        } else {
            return 0
        }
    })

    fastify.get("/backend/unban-user/:userId/now", async (req, rep) => {
        const accounts = readAccountsFile()
        const account = accounts.find(account => account.discordId === req.params.userId);
        if (account) {
            account.isLocked = false
            writeAccountsFile(accounts)
        } else {
            webhook(secWh, "account to unban wasnt found...")
        }

        webhook(secWh, "<@" + req.params.userId + "> got unbanned!")
        return "ok"
    })




    //Admin endpoints to lock/unlock specific things
    fastify.get("/backend/lockdown/now", async (req, rep) => {
        await mem.set("lockdown", true)
        webhook(secWh, "Lockdown started!")
        return "ok"
    })


    fastify.get("/backend/release/now", async (req, rep) => {
        await mem.set("lockdown", false)
        webhook(secWh, "Lockdown got released!")
        return "ok"
    })


    fastify.get("/backend/lock-login/now", async (req, rep) => {
        await mem.set("loginLocked", true)
        webhook(secWh, "Login got locked!")
        return "ok"
    })


    fastify.get("/backend/unlock-login/now", async (req, rep) => {
        await mem.set("loginLocked", false)
        webhook(secWh, "Login got unlocked!")
        return "ok"
    })



    fastify.get("/backend/lock-trading/now", async (req, rep) => {
        await set("tradingLocked", true)
        webhook(secWh, "Trading got locked")
        return "ok"
    })


    fastify.get("/backend/unlock-trading/now", async (req, rep) => {
        await set("tradingLocked", false)
        webhook(secWh, "Trading got unlocked!")
        return "ok"
    })



    //Get all the stats
    function returnLocalStats() {

        const memoryUsage = process.memoryUsage();
        const cpuUsage = os.loadavg();
        const systemDetails = {
            memoryUsage: {
                rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
                heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
                heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB',
            },
            cpuUsage: {
                '1min': cpuUsage[0].toFixed(2),
                '5min': cpuUsage[1].toFixed(2),
                '15min': cpuUsage[2].toFixed(2)
            }
        };




        return {
            "clusterConnections": Object.keys(localClients).length,
            "system": systemDetails
        }
    }




    //Ping all connections
    setInterval(async function() {
        for (let clientId of Object.keys(localClients)) {
            let client = localClients[clientId];
            if (client.readyState === 1) {
                client.send(JSON.stringify({
                    type: 'ping'
                }));
            }
        }
    }, 20 * 1000);



    //helper function to check the hash
    function generateHmac(data) {
        try {
            const hmac = crypto.createHmac('sha256', Buffer.from("superSecretKey", 'utf-8'));
            hmac.update(Buffer.from(data, 'utf-8'));
            return hmac.digest('hex');
        } catch (e) {
            webhook(w7, "Error at generateHmac -> " + e)
        }
    }

    //Verify the users hash
    function verifyHash(hash, data) {
        const generatedHash = generateHmac(data);
        return hash === generatedHash;
    }



    //Account helper functions
    const readAccountsFile = () => {
        try {
            if (!fs.existsSync(accPath)) {
                return [];
            }
            const data = fs.readFileSync(accPath);
            return JSON.parse(data);
        } catch (e) {
            webhook(w7, "Error at readAccountFile -> " + e)
        }
    };

    const writeAccountsFile = (accounts) => {
        try {
            fs.writeFileSync(accPath, JSON.stringify(accounts, null, 2));
        } catch (e) {
            webhook(w7, "Error at writeAccountsFile -> " + e)
        }
    };




    function webhook(link, message) {
        const timestampInSeconds = Math.floor(Date.now() / 1000);

        const discordTimestamp = `<t:${timestampInSeconds}>`;
        const data = JSON.stringify({
            content: message + " -> " + discordTimestamp
        })

        const options = {
            hostname: 'discord.com',
            path: link.split("discord.com")[1],
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let response = '';

            res.on('data', (chunk) => {
                response += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 204) {} else {}
            });
        });

        req.on('error', (e) => {});
        req.write(data);
        req.end();
    }




    //Error handling
    process.on('uncaughtException', (error) => {
        const MAX_STACK_TRACE_LENGTH = 1000;
        let stackTrace = error.stack || '';

        if (stackTrace.length > MAX_STACK_TRACE_LENGTH) {
            stackTrace = stackTrace.substring(0, MAX_STACK_TRACE_LENGTH) + '... (truncated)';
        }
        const errorDetails = {
            message: error.message,
            stack: stackTrace,
            lineNumber: (error.stack.split('\n')[1] || '').trim()
        };
        handleError(errorDetails);
    });


    function handleError(errorDetails) {
        wh(errorDetails.message);
        wh(errorDetails.stack);
        wh(errorDetails.lineNumber);
    }


    function wh(error) {
        console.log("Check error logs")
        webhook(errorWh, error)
    }


    return fastify
}




//Manager code


if (cluster.isMaster) {
    const numCPUs = 4 //u can choose a number of cpu cores depening on your system
    console.log(`Master ${process.pid} is running`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    const mem = require('cluster-shared-memory');

    //The shared memory objects

    mem.set("loginLocked", false)
    mem.set("tradingLocked", false)
    mem.set("lockdown", false)
    mem.set("rateLimitStore", new Map())
    mem.set("hashSet", new Set())

    setTimeout(function() {
        mem.set("hashSet", new Set())
    }, 1000 * 60 * 60 * 12)


    mem.set("stats", {})

    mem.set("clients", {})
    mem.set("invites", {})
    mem.set("trades", {})

    //random trading queue
    mem.set("16Queue", [])
    mem.set("17Queue", [])
    mem.set("18Queue", [])
    mem.set("19Queue", [])
    mem.set("20Queue", [])
    mem.set("21Queue", [])
    mem.set("22Queue", [])
    mem.set("23Queue", [])

    mem.set("usageStats", {
        successfulTrades: 0,
        totalCoinsTraded: 0,
        totalCardsTraded: 0
    })
    mem.set("historicalStats", [])




    const readAccountsFile = () => {
        try {
            if (!fs.existsSync("accounts.json")) {
                return [];
            }
            const data = fs.readFileSync("accounts.json");
            return JSON.parse(data);
        } catch (e) {
            console.log(e)
        }
    };




    setInterval(async function() {
        const amount = numCPUs
        var clusters = {}
        for (const id in cluster.workers) {
            var objPush = {}
            objPush.pid = cluster.workers[id].process.pid

            clusters[objPush.pid] = objPush

        }
        const finishObj = {}
        finishObj.amount = amount


        finishObj.loginLocked = await mem.get("loginLocked")

        finishObj.tradingLocked = await mem.get("tradingLocked")

        finishObj.lockdown = await mem.get("lockdown")




        //both needs special care

        finishObj.online = Object.keys(await mem.get("clients")).length //only save name:pid

        finishObj.invites = Object.keys(await mem.get("invites")).length

        finishObj.users = readAccountsFile().length




        finishObj.clusters = clusters


        mem.set("stats", finishObj)

        for (const id in cluster.workers) {
            const statsMsg = {

                "type": "stats"

            }



            setTimeout(function() {
                cluster.workers[id].process.send(statsMsg)
            }, Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000)


        }


    }, 1000 * 60)

    async function saveStatsSnapshot() {
        const stats = await mem.get("usageStats");

        var now = new Date();
        now = now.toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin'
        });
        const historicalStats = await mem.get("historicalStats") || [];

        historicalStats.push({
            timestamp: now,
            stats: stats
        });

        await mem.set("historicalStats", historicalStats);
    }


    setInterval(saveStatsSnapshot, 60 * 1000);


    cluster.on('message', (worker, message) => {



        const targetPid = message.pid;
        for (const id in cluster.workers) {
            if (cluster.workers[id].process.pid === targetPid) {
                cluster.workers[id].send(message);
                break;
            }
        }

    });


    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork()
        console.log("restarted cluster")
    });

} else {
    const fastify = createServer();
    fastify.listen({
        port: 10000,
        host: "0.0.0.0"
    })
    console.log(`Server worker ${process.pid} started`);
}




//And thats it :)
