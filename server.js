const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// ================================
// CALCULATOR TOOL
// ================================

function calculator(expression) {
    // Only allow numbers and basic math operators
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
        throw new Error("Invalid calculation");
    }

    return Function(
        `"use strict"; return (${expression})`
    )();
}


// ================================
// CHAT ENDPOINT
// ================================

app.post("/chat", async (req, res) => {

    try {

        const history = req.body.history || [];

        if (history.length === 0) {
            return res.status(400).json({
                error: "No conversation received"
            });
        }


        // ================================
        // TOOLS AVAILABLE TO THE AI
        // ================================

        const tools = [

            {
                type: "web_search"
            },

            {
                type: "function",

                name: "calculator",

                description:
                    "Calculate mathematical expressions accurately.",

                parameters: {

                    type: "object",

                    properties: {

                        expression: {
                            type: "string",
                            description:
                                "Mathematical expression such as 245*87"
                        }

                    },

                    required: ["expression"],

                    additionalProperties: false
                },

                strict: true
            }

        ];


        // ================================
        // FIRST AI REQUEST
        // ================================

        let response = await fetch(
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
                        history,

                    tools:
                        tools

                })

            }
        );


        let data = await response.json();


        if (!response.ok) {

            return res.status(
                response.status
            ).json({

                error: data

            });

        }


        // ================================
        // AGENT TOOL LOOP
        // ================================

        while (true) {

            const toolCalls =
                (data.output || []).filter(
                    item =>
                        item.type ===
                        "function_call"
                );


            // No function calls?
            // AI has finished.

            if (toolCalls.length === 0) {
                break;
            }


            // Keep everything the model returned

            const nextInput = [
                ...history,
                ...(data.output || [])
            ];


            // Run every requested tool

            for (const call of toolCalls) {

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


                        nextInput.push({

                            type:
                                "function_call_output",

                            call_id:
                                call.call_id,

                            output:
                                String(result)

                        });

                    } catch (error) {

                        nextInput.push({

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


            // Ask the AI to continue

            response = await fetch(

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
                            nextInput,

                        tools:
                            tools

                    })

                }

            );


            data =
                await response.json();


            if (!response.ok) {

                return res.status(
                    response.status
                ).json({

                    error: data

                });

            }

        }


        // ================================
        // GET FINAL ANSWER
        // ================================

        let reply =
            data.output_text || "";


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
                    "OpenAI returned no text"

            });

        }


        res.json({

            reply:
                reply

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


// ================================
// START SERVER
// ================================

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
