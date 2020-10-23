const { create, decryptMedia } = require('@open-wa/wa-automate')
const moment = require('moment')
const { tiktok, instagram, twitter, facebook } = require('./lib/dl-video')
const urlShortener = require('./lib/shortener')
const color = require('./lib/color')
const { fetchMeme } = require('./lib/fetcher')

const serverOption = {
    headless: true,
    qrRefreshS: 20,
    qrTimeout: 0,
    authTimeout: 0,
    autoRefresh: true,
    killProcessOnBrowserClose: true,
    cacheEnabled: false,
    chromiumArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // THIS MAY BREAK YOUR APP !!!ONLY FOR TESTING FOR NOW!!!
        '--aggressive-cache-discard',
        '--disable-cache',
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disk-cache-size=0'
    ]
}

const opsys = process.platform
if (opsys === 'win32' || opsys === 'win64') {
    serverOption.executablePath = 'usr/bin/google-chrome-stable'
} else if (opsys === 'linux') {
    serverOption.browserRevision = '737027'
} else if (opsys === 'darwin') {
    serverOption.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
}

const startServer = async () => {
    create('Imperial', serverOption)
        .then(client => {
            console.log('[DEV] Red Emperor')
            console.log('[SERVER] Server Started!')
            // Force it to keep the current session
            client.onStateChanged(state => {
                console.log('[Client State]', state)
                if (state === 'CONFLICT') client.forceRefocus()
            })
            // listening on message
            client.onMessage((message) => {
                msgHandler(client, message)
            })
            // listening on Incoming Call
            // client.onIncomingCall((call) => {
            //     client.sendText(call.peerJid._serialized, 'Maaf, saya tidak bisa menerima panggilan.')
            // })
        })
}

async function msgHandler (client, message) {
    try {
        const { type, id, from, t, sender, isGroupMsg, chat, caption, isMedia, mimetype, quotedMsg } = message
        let { body } = message
        const { name } = chat
        let { pushname, verifiedName } = sender
        // verifiedName is the name of someone who uses a business account
        pushname = pushname || verifiedName
        const prefix = '#'
        body = (type == 'chat' && body.startsWith(prefix)) ? body : ((type == 'image' && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()
        const args = body.slice(prefix.length).trim().split(/ +/).slice(1)
        const isCmd = body.startsWith(prefix)
        const time = moment(t * 1000).format('DD/MM HH:mm:ss')
        if (!isCmd && !isGroupMsg) return console.log('[RECV]', color(time, 'yellow'), 'Message from', color(pushname))
        if (!isCmd && isGroupMsg) return console.log('[RECV]', color(time, 'yellow'), 'Message from', color(pushname), 'in', color(name))
        if (isCmd && !isGroupMsg) console.log(color('[EXEC]'), color(time, 'yellow'), color(`${command} (${args.length})`), 'from', color(pushname))
        if (isCmd && isGroupMsg) console.log(color('[EXEC]'), color(time, 'yellow'), color(`${command} (${args.length})`), 'from', color(pushname), 'in', color(name))

        // Checking function speed
        // const timestamp = moment()
        // const latensi = moment.duration(moment() - timestamp).asSeconds()
        const isUrl = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi)
        const uaOverride = 'WhatsApp/2.2029.4 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'

        switch (command) {
        case 'tnc':
            client.sendText(from, 'Bot ini adalah bot yg dibuat menggunakan java script. \n\nBy using the bot you agreeing to our Terms and Conditions! \nWe do not store any of your data in our servers. We are not responsible for stickers that you create using bots, videos, images or other data that you get from this bot.')
            break
        case 'menu':
        case 'help': {
            const text = `Hi, ${pushname}! cmd nya itu /n/nBUAT STIKER /n/n#stiker /n/nkirim foto trus kasih caption #stiker /n/n#Gifstiker(masih bug) /n/n*download cmd*(juga masih bug masalah di server) /n/n#tiktok <link> /n #ig <link> /n #fb <link> /n*other command* /n #snk /n syarat dan ketentuan bot /n *made by faiz*`
            client.sendText(from, text)
            break
        }
        case 'sticker':
        case 'stiker':
            if (isMedia) {
                const mediaData = await decryptMedia(message, uaOverride)
                const imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                await client.sendImageAsSticker(from, imageBase64)
            } else if (quotedMsg && quotedMsg.type == 'image') {
                const mediaData = await decryptMedia(quotedMsg)
                const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                await client.sendImageAsSticker(from, imageBase64)
            } else if (args.length == 1) {
                const url = args[0]
                if (!url.match(isUrl)) client.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id)
                await client.sendStickerfromUrl(from, url)
                    .then((r) => {
                        if (!r && r !== undefined) client.sendText(from, 'Maaf, link yang kamu kirim tidak memuat gambar.')
                    })
            } else {
                client.reply(from, 'Tidak ada gambar! Untuk membuka daftar perintah kirim #menu', id)
            }
            break
        case 'gif':
        case 'stikergif':
        case 'stickergif':
        case 'gifstiker':
        case 'gifsticker':
            if (args.length == 1){
                const url = args[0]
                const isMediaGiphy = url.match(new RegExp(/https?:\/\/media.giphy.com\/media/, 'gi'));
                const isGiphy = url.match(new RegExp(/https?:\/\/(www\.)?giphy.com/, 'gi'));
                if(isGiphy){
                    const getGiphyCode = url.match(new RegExp(/(\/|\-)(?:.(?!(\/|\-)))+$/, 'gi'));
                    if(getGiphyCode){
                        let delChars = getGiphyCode[0].replace(/[-\/]/gi, "");
                        const smallGif = "https://media.giphy.com/media/"+delChars+"/giphy-downsized.gif";
                        await client.sendGiphyAsSticker(from, smallGif)
                        .catch((err) => {
                            console.log(err)
                        })
                    } else {
                        client.reply(from, "Gagal membuat sticker gif", id)
                    }
                } else if(isMediaGiphy){
                    const normalGif = url.match(new RegExp(/(giphy|source).(gif|mp4)/, 'gi'));
                    if(normalGif){
                        let smallGif = url.replace(normalGif[0], "giphy-downsized.gif")
                        await client.sendGiphyAsSticker(from, smallGif)
                        .catch((err) => {
                            console.log(err)
                        })
                    }
                } else {
                    client.reply(from, "Saat ini sticker gif hanya bisa menggunakan link giphy saja kak.", id)
                }
            }
            break
                  // voice command section, will make a request to google translate API and recieved voice data.
            case "voice":
                // get country language code
                if (body.split(" ").slice(1, 2).toString()) {
                    let lang = body.split(" ").slice(1, 2).toString();
                    lang = langCheck(lang);

                    let text = body.split(" ").slice(2).toString().replace(/,/g, " ");
                    if (lang === undefined) {
                        lang = "id";
                        text = body.split(" ").slice(1).toString().replace(/,/g, " ");
                    }

                    client
                        .sendFileFromUrl(from, `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${text}`, "voice", "voice chat", id)
                        .then((res) => console.log(`[INFO] ${from} Send Voice From google`))
                        .catch((err) => {
                            console.log(`[ERR] ${from} Failed sending voice note `);
                            client.reply(from, "Pengambilan Voice Gagal. Coba lagi! 🤖", id);
                        });
                } else {
                    // when there is no country language code
                    console.log(`[FAIL] ${from} Should input Language country code`);
                    client.reply(from, `*Pastikan anda memasukan kode Bahasa dan Pesan yang ingin di konversi ke voice!* 🤖`, id);
                }
                break;
        case 'mim':
        case 'memes':
        case 'meme': {
            const { title, url } = await fetchMeme()
            await client.sendFileFromUrl(from, `${url}`, 'meme.jpg', `${title}`)
            break
        }
        default:
            console.log(color('[ERROR]', 'red'), color(time, 'yellow'), 'Unregistered Command from', color(pushname))
            break
        }
    } catch (err) {
        console.log(color('[ERROR]', 'red'), err)
    }
}

startServer()
