const express = require("express");
const cors = require("cors");

const app = express();

let blenderTasks = [];

app.use(cors());
app.use(express.json());


// =====================================
// CALCULATOR
// =====================================

function calculator(expression) {
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
        throw new Error("Invalid calculation");
    }

    return Function(
        `"use strict"; return (${expression})`
    )();
}


// =====================================
// GENERAL AI TOOLS
// =====================================

const tools = [
    {
        type: "web_search"
    },
    {
        type: "function",
        name: "calculator",
        description: "Accurately calculate basic mathematical expressions.",
        parameters: {
            type: "object",
            properties: {
                expression: {
                    type: "string",
                    description: "A mathematical expression such as 125*48"
                }
            },
            required: ["expression"],
            additionalProperties: false
        },
        strict: true
    }
];


// =====================================
// TEXT EXTRACTION
// =====================================

function extractText(data) {
    let text = data.output_text || "";

    if (!text && data.output) {
        for (const item of data.output) {
            if (!item.content) continue;

            for (const content of item.content) {
                if (content.text) {
                    text += content.text;
                }
            }
        }
    }

    return text;
}


// =====================================
// GENERAL CHAT
// =====================================

app.post("/chat", async (req, res) => {
    try {
        const history = req.body.history || [];

        if (history.length === 0) {
            return res.status(400).json({
                error: "No conversation received"
            });
        }

        let input = [...history];

        for (let step = 0; step < 10; step++) {
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
                        input: input,
                        tools: tools
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error("OpenAI error:", JSON.stringify(data));

                return res.status(response.status).json({
                    error: data
                });
            }

            input.push(...(data.output || []));

            const toolCalls = (data.output || []).filter(
                item => item.type === "function_call"
            );

            if (toolCalls.length === 0) {
                const reply = extractText(data);

                if (!reply) {
                    return res.status(500).json({
                        error: "AI returned no text"
                    });
                }

                return res.json({
                    reply: reply
                });
            }

            for (const call of toolCalls) {
                if (call.name === "calculator") {
                    try {
                        const args = JSON.parse(call.arguments);
                        const result = calculator(args.expression);

                        input.push({
                            type: "function_call_output",
                            call_id: call.call_id,
                            output: String(result)
                        });
                    } catch (error) {
                        input.push({
                            type: "function_call_output",
                            call_id: call.call_id,
                            output: `Calculator error: ${error.message}`
                        });
                    }
                }
            }
        }

        return res.status(500).json({
            error: "Agent reached maximum steps"
        });

    } catch (error) {
        console.error("Chat server error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// =====================================
// MARKET INTELLIGENCE PREDICTION ENGINE
// =====================================

app.post("/market-intelligence", async (req, res) => {
    try {
        const question = req.body.question;
        const symbol = req.body.symbol || "the requested market";

        if (!question) {
            return res.status(400).json({
                error: "No market question received"
            });
        }

        const marketPrompt = `
You are NOVA Predictive Market Intelligence, an advanced educational
market-research and forecasting AI.

Analyze this market request:

Market/instrument: ${symbol}
User request: ${question}

Your job is NOT to guarantee the future and NOT to provide certainty.
Create a probability-based market scenario analysis.

Return the answer using exactly these sections:

MARKET OUTLOOK
Give the current overall outlook using one:
Bullish, Bearish, Neutral, or Highly Uncertain.

PREDICTIVE SCENARIO
Explain the most likely possible movement and the requested time horizon.
Use probability language, never certainty.

BULLISH SCENARIO
Explain what could cause an upward move.

BEARISH SCENARIO
Explain what could cause a downward move.

KEY EVIDENCE
List the important technical, fundamental, news, global-market,
sector, volume, and sentiment factors that should be checked.

CONFIDENCE
Give a cautious confidence estimate from 0-100%.
Explain why confidence is limited.

INVALIDATION CONDITIONS
Explain what event or price behavior would make this prediction unreliable.

RISK WARNING
Explain that this is educational analysis, not guaranteed financial advice.
Never claim that the user will definitely profit.
Do not tell the user to blindly buy or sell.

If live verified data is unavailable, clearly say that live data is needed
before treating the analysis as current.
`;

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
                    input: [
                        {
                            role: "system",
                            content: marketPrompt
                        },
                        {
                            role: "user",
                            content: question
                        }
                    ],
                    tools: [
                        {
                            type: "web_search"
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "Market AI error:",
                JSON.stringify(data)
            );

            return res.status(response.status).json({
                error: data
            });
        }

        const analysis = extractText(data);

        if (!analysis) {
            return res.status(500).json({
                error: "Market AI returned no analysis"
            });
        }

        res.json({
            success: true,
            symbol: symbol,
            analysis: analysis,
            disclaimer:
                "Educational probability-based analysis only. No prediction is guaranteed."
        });

    } catch (error) {
        console.error("Market intelligence error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// =====================================
// COMPUTER USE
// =====================================

app.post("/computer", async (req, res) => {
    try {
        const task = req.body.task;

        if (!task) {
            return res.status(400).json({
                error: "No computer task received"
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
                    model: "computer-use-preview",
                    tools: [
                        {
                            type: "computer_use_preview",
                            display_width: 1280,
                            display_height: 720,
                            environment: "browser"
                        }
                    ],
                    input: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "input_text",
                                    text: task
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data
            });
        }

        const computerCalls = (data.output || []).filter(
            item => item.type === "computer_call"
        );

        res.json({
            message: "Computer-use request created.",
            task: task,
            computer_calls: computerCalls
        });

    } catch (error) {
        console.error("Computer server error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// =====================================
// COMPUTER SCREEN ANALYSIS
// =====================================

app.post("/computer-screen", async (req, res) => {
    try {
        const image = req.body.image;

        if (!image) {
            return res.status(400).json({
                error: "No screenshot received"
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
                    input: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "input_text",
                                    text:
                                        "Analyze this computer screenshot. Explain what is visible and suggest the next useful action."
                                },
                                {
                                    type: "input_image",
                                    image_url: image
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data
            });
        }

        res.json({
            analysis:
                extractText(data) || "No analysis returned."
        });

    } catch (error) {
        console.error("Screen analysis error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// =====================================
// BLENDER TASK QUEUE
// =====================================

app.post("/blender-task", (req, res) => {
    const task = req.body.task;

    if (!task) {
        return res.status(400).json({
            error: "No Blender task received"
        });
    }

    const id = Date.now().toString();

    blenderTasks.push({
        id: id,
        task: task
    });

    console.log("Blender task added:", task);

    res.json({
        success: true,
        id: id,
        task: task
    });
});


app.get("/blender-task/next", (req, res) => {
    if (blenderTasks.length === 0) {
        return res.json({
            task: null
        });
    }

    const task = blenderTasks.shift();

    res.json(task);
});


// =====================================
// HEALTH CHECK
// =====================================

app.get("/", (req, res) => {
    res.json({
        status: "online",
        name: "NOVA AI Backend",
        features: [
            "General AI",
            "Market Intelligence",
            "Predictive Scenarios",
            "Computer Use",
            "Screen Analysis",
            "Blender Automation"
        ]
    });
});


// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `NOVA AI server running on port ${PORT}`
    );
});
