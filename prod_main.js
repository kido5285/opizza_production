require('dotenv').config();
const {Client, LocalAuth, MessageMedia}  = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--disable-features=site-per-process'
        ]
    }
});

let menuImage;

client.once('ready', async () => {
    console.log('client is ready');
    const imagePath = path.resolve('menu.jpg');
    const imageData = await fs.promises.readFile(imagePath, { encoding: 'base64' });
    menuImage = new MessageMedia('image/jpeg', imageData, 'menu.jpg');
});

client.on('qr' , (qr) => {
    qrcode.generate(qr, {small: true});
})

client.initialize();

let pickup_welcome_mes = 
`👋 *Welcome to O'Pizza!*
🎉 We're officially opening on *June 4th*! 🎉

To celebrate our launch:
🍕 Enjoy *FREE pizza tasting* at our store!
💥 Get *20% off* all walk-in orders – only on opening day!

How would you like to order?

Please reply with number (1, 2 or 3):
1️⃣ *Takeaway*  
2️⃣ *Delivery*  
3️⃣ *FAQ & Inquiry*`;

let faq = 
`# 🍕 O'Pizza - Frequently Asked Questions (FAQ)

📍 *Our Location:*  
Lot 763, Jalan 2C, Kampung Baru Subang, 40150 Shah Alam, Selangor  
📌 [🗺️ View on Google Maps](https://maps.app.goo.gl/BjPVJkrs9zCCJTkV9)

1. **Are you halal?**  
✅ Yes, we use only halal-certified ingredients. We do not serve pork or alcohol in any of our items.

2. **Do you offer dine-in?**  
❌ Unfortunately, we do not offer dine-in services. But we do offer take-away and delivery options. 🔗 [https://feedme.cc/681c7c3c44b369001c432de7] 
You can also pre-order for future reservations. (within 7 days upon order)

3. **What are your business hours?**  
🕙 We’re open daily from 10:00 AM to 9:00 PM.  
Please ensure your pickup time is within these hours.
---

❓ **Have more questions?**  
Feel free to send us a message anytime at **+60185795338** — our staff is happy to help!

*Type* \`\`\`1\`\`\` *to place an order.*
`

let del_url = "https://feedme.cc/681c7c3c44b369001c432de7";

let delivery_mes = 
`🏍️ *You selected Delivery.*

Please place your order through our delivery partner:
🔗 ${del_url}

🔁 *Type* \`1\` *to place a new order.*`

let takeaway_mes = 
`*You selected Takeaway.*

Please place your order using the link below:
🔗 ${del_url}

🔁 *Type* \`1\` *to place a new order.*`

async function sendMenuImage(chatId) {
  if (menuImage) {
    await client.sendMessage(chatId, menuImage);
  } else {
    console.error('menuImage not loaded');
  }
}

function isBusinessHours() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  return (hours > 10 && hours < 21) || (hours === 10) || (hours === 21 && minutes === 0);
}

const current_states = new Map();

client.on('message', async (msg) => {
    let user = msg.from;
    let option = msg.body.trim().toLowerCase();
    let current_state = current_states.get(user) || 'new_start';
    if (isBusinessHours()){
        if (current_state == 'new_start'){
            await client.sendMessage(user, pickup_welcome_mes);
            await sendMenuImage(user);
            current_states.set(user, 'start');
            return;
        }
        if (current_state == 'start'){
            if (option == '1')
            {
                await client.sendMessage(user, takeaway_mes);
                current_states.set(user, 'new_start');
                return;
            }
            else if (option == '2')
            {
                await client.sendMessage(user, delivery_mes);
                current_states.set(user, 'new_start');
                return;
            }
            else if (option == '3')
            {
                await client.sendMessage(user, faq);
                current_states.set(user, 'new_start');
                return;
            }
            else
            {
                await client.sendMessage(user, `*Please enter a valid option (1, 2 or 3).*`);
                return;
            }
        }
    } else {
        await client.sendMessage(user, `*Hi! We're currently closed 🕘 Our business hours are 10 AM to 9 PM. Please reach out during those hours to place an order — we’ll be glad to help you then!*`)
        return;
    }
})