const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate', async (req, res) => {
    const { context } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // This is where you'll construct your metaprompt
    const metaprompt = `
        Based on the following context:
        ${JSON.stringify(context, null, 2)}

        Please generate the requested code.
    `;

    const result = await model.generateContent(metaprompt);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
});

const port = 3001;
app.listen(port, () => {
    console.log(`MCP server running on http://localhost:${port}`);
});