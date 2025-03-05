import { client } from "../utils/twillio"
import dotenv from "dotenv"

dotenv.config()

export const sendWhatsapp = async (to: string, message: string) => {
    try {
        const response = await client.messages.create({
            from: process.env.TWILLIO_WHATSAPP_NUMBER! as string,
            to: `whatsapp:${to}`,
            body: message
        });
        return response;
    } catch (error) {
        console.error("Twilio Error:", error);
        throw new Error("Failed to send WhatsApp message");
    }
}