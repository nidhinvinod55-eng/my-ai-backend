const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
    try {
        const history = req.body.history || [];

        if (history.length === 0) {
            return res.status(400).json({
                error: "No conversation received"
            });
        }

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.OPENAI_API_KEY}`
                },

                body: JSON.stringify({
                    model: "gpt-5.6-luna",
                    input: history
                })
            }
        );

        const data = await response.json();

        console.log(
            "OpenAI response:",
            JSON.stringify(data)
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: data
            });
        }

        let reply = "";

        if (data.output_text) {
            reply = data.output_text;
        }

        if (!reply && data.output) {

            for (const item of data.output) {

                if (!item.content) continue;

                for (const content of item.content) {

                    if (content.text) {
                        reply += content.text;
                    }

                }
            }
        }

        if (!reply) {
            return res.status(500).json({
                error: "OpenAI returned no text"
            });
        }

        res.json({
            reply: reply
        });

    } catch (error) {

        console.error(
            "Server error:",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `AI server running on port ${PORT}`
        );
    }
);
