import { APIGatewayProxyHandler } from 'aws-lambda';
import { initializeBot } from '../services/botService';

export const handler: APIGatewayProxyHandler = async (event) => {
    initializeBot();
    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Bot is running" }),
    };
};
