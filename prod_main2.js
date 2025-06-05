require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

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
let orderLink = "https://feedme.cc/681c7c3c44b369001c432de7";
const processingUsers = new Set();

client.once('ready', async () => {
  console.log('client is ready');
  const imagePath = path.resolve('menu.jpg');
  const imageData = await fs.promises.readFile(imagePath, { encoding: 'base64' });
  menuImage = new MessageMedia('image/jpeg', imageData, 'menu.jpg');
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.initialize();

const pickupWelcomeMessage = 
`👋 *Welcome to O'Pizza!*

How would you like to order?

Please reply with number (1, 2 or 3):
1️⃣ *Takeaway*  
2️⃣ *Delivery*  
3️⃣ *FAQ & Inquiry*`;

const faq = 
`📌 *O'Pizza - Frequently Asked Questions (FAQ)*

📍 *Location:*  
Lot 763, Jalan 2C, Kampung Baru Subang, 40150 Shah Alam, Selangor  
🌐 [View on Google Maps](https://maps.app.goo.gl/BjPVJkrs9zCCJTkV9)

1. *Are you halal?*  
✅ Yes, we use only halal-certified ingredients. No pork or alcohol.

2. *Do you offer dine-in?*  
❌ No. Only *take-away* and *delivery*.  
🔗 ${orderLink}

3. *What are your business hours?*  
🕙 Open daily from *10:00 AM to 9:00 PM*.

❓ Have more questions?  
Message us at *+60185795338*

🔁 *Type 1 to place an order.*`;

const takeawayMessage = 
`🛍️ *You selected Takeaway.*

Please place your order here:
🔗 ${orderLink}

🔁 *Type 1 to place another order.*`;

const deliveryMessage = 
`🏍️ *You selected Delivery.*

Please place your order here:
🔗 ${orderLink}

🔁 *Type 1 to place another order.*`;


function isBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  return (hour > 10 && hour < 21) || (hour === 10) || (hour === 21 && minutes === 0);
}

const currentStates = new Map();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMenuWithLoading(chatId) {
  const loading = await client.sendMessage(chatId, '⏳ Loading menu, please wait...');
  await delay(800);
  if (menuImage) {
    await client.sendMessage(chatId, menuImage);
  } else {
    await client.sendMessage(chatId, '❌ Menu image is currently unavailable.');
  }
  await loading.delete(false); // delete for bot only
}

client.on('message', async (msg) => {
  const user = msg.from;
  const input = msg.body.trim().toLowerCase();

  if (processingUsers.has(user)) return;
  processingUsers.add(user);

  const currentState = currentStates.get(user) || 'new_start';

  try {
    if (!isBusinessHours()) {
      await client.sendMessage(user, '*Hi! We’re currently closed 🕘 Business hours are 10 AM to 9 PM.*');
      return;
    }

    if (currentState === 'new_start') {
      await client.sendMessage(user, pickupWelcomeMessage);
      await sendMenuWithLoading(user);
      currentStates.set(user, 'start');
    } else if (currentState === 'start') {
      if (input === '1') {
        await client.sendMessage(user, takeawayMessage);
        currentStates.set(user, 'new_start');
      } else if (input === '2') {
        await client.sendMessage(user, deliveryMessage);
        currentStates.set(user, 'new_start');
      } else if (input === '3') {
        await client.sendMessage(user, faq);
        currentStates.set(user, 'new_start');
      } else {
        await client.sendMessage(user, '*Please enter a valid option (1, 2 or 3).*');
      }
    }
  } catch (err) {
    console.error('Error handling message:', err);
  } finally {
    processingUsers.delete(user);
  }
});

