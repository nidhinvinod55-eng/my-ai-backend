const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// =====================================
// CALCULATOR TOOL
// =====================================

function calculator(expression) {

    // Allow only basic mathematics
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
        throw new Error("Invalid calculation");
    }

    return Function(
        `"use strict"; return (${expression})`
    )();
}


// =====================================
// TOOLS
// =====================================

const tools = [

    // Web search
    {
        type: "web_search"
    },

    // Calculator
    {
        type: "function",

        name: "calculator",

        description:
            "Accurately calculate mathematical expressions.",

        parameters: {

            type: "object",

            properties: {

                expression: {
                    type: "string",
                    description:
                        "A mathematical expression such as 125*48"
                }

            },

            required: ["expression"],

            additionalProperties: false
        },

        strict: true
    }
];


// =====================================
// CHAT
// =====================================

app.post("/chat", async (req, res) => {

    try {

        const history =
            req.body.history || [];


        if (history.length === 0) {

            return res.status(400).json({
                error:
                    "No conversation received"
            });

        }


        // Start with the user's conversation
        let input = [...history];


        // =================================
        // AGENT LOOP
        // =================================

        for (let step = 0; step < 10; step++) {

            const response = await fetch(

                "https://api.openai.com/v1/responses",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${process.env.OPENAI_API_KEY}`

                    },

                    body: JSON.stringify({

                        model:
                            "gpt-5.6-luna",

                        input:
                            input,

                        tools:
                            tools

                    })

                }

            );


            const data =
                await response.json();


            if (!response.ok) {

                console.error(
                    "OpenAI error:",
                    JSON.stringify(data)
                );

                return res.status(
                    response.status
                ).json({

                    error: data

                });

            }


            // Add the model's response
            // to the ongoing conversation

            input.push(
                ...(data.output || [])
            );


            // Find function calls

            const toolCalls =
                (data.output || []).filter(

                    item =>
                        item.type ===
                        "function_call"

                );


            // No function calls means
            // the agent has finished.

            if (toolCalls.length === 0) {

                let reply =
                    data.output_text || "";


                // Backup text extraction

                if (
                    !reply &&
                    data.output
                ) {

                    for (
                        const item
                        of data.output
                    ) {

                        if (!item.content)
                            continue;


                        for (
                            const content
                            of item.content
                        ) {

                            if (content.text) {

                                reply +=
                                    content.text;

                            }

                        }

                    }

                }


                if (!reply) {

                    return res.status(500).json({

                        error:
                            "AI returned no text"

                    });

                }


                return res.json({

                    reply:
                        reply

                });

            }


            // =================================
            // RUN TOOLS
            // =================================

            for (
                const call
                of toolCalls
            ) {

                if (
                    call.name ===
                    "calculator"
                ) {

                    try {

                        const args =
                            JSON.parse(
                                call.arguments
                            );


                        const result =
                            calculator(
                                args.expression
                            );


                        input.push({

                            type:
                                "function_call_output",

                            call_id:
                                call.call_id,

                            output:
                                String(result)

                        });


                    } catch (error) {

                        input.push({

                            type:
                                "function_call_output",

                            call_id:
                                call.call_id,

                            output:
                                `Calculator error: ${error.message}`

                        });

                    }

                }

            }

        }


        // Prevent endless tool loops

        return res.status(500).json({

            error:
                "Agent reached the maximum number of steps."

        });


    } catch (error) {

        console.error(
            "Server error:",
            error
        );


        res.status(500).json({

            error:
                error.message

        });

    }

});


// =====================================
// START SERVER
// =====================================

// =====================================
// COMPUTER USE - STEP 5B
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

            console.error(
                "Computer-use error:",
                JSON.stringify(data)
            );

            return res.status(response.status).json({
                error: data
            });
        }

        const computerCalls =
            (data.output || []).filter(
                item =>
                    item.type ===
                    "computer_call"
            );

        res.json({
            message:
                "Computer-use request created.",

            task: task,

            computer_calls:
                computerCalls
        });

    } catch (error) {

        console.error(
            "Computer server error:",
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
