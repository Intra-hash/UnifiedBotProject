import AWS from 'aws-sdk';
import { User } from '../models/models';

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE as string;

// Função para ler todos os usuários do DynamoDB
export const readUsers = async (): Promise<{ [key: string]: User }> => {
    const params = {
        TableName: USERS_TABLE,
    };

    const data = await dynamoDB.scan(params).promise();
    const users: { [key: string]: User } = {};

    data.Items?.forEach(item => {
        users[item.UserId] = {
            userId: item.UserId,
            username: item.username,
            password: item.password,
        };
    });

    return users;
};

// Função para ler um usuário específico pelo ID
export const readUserById = async (userId: string): Promise<User | null> => {
    const params = {
        TableName: USERS_TABLE,
        Key: { UserId: userId },
    };

    const data = await dynamoDB.get(params).promise();

    if (data.Item) {
        return {
            userId: data.Item.UserId,
            username: data.Item.username,
            password: data.Item.password,
        };
    }

    return null;
};

// Função para salvar usuários no DynamoDB
export const saveUsers = async (users: { [key: string]: User }): Promise<void> => {
    const batchWriteParams: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
        RequestItems: {
            [USERS_TABLE]: [],
        },
    };

    for (const [userId, user] of Object.entries(users)) {
        (batchWriteParams.RequestItems[USERS_TABLE] as AWS.DynamoDB.DocumentClient.WriteRequest[]).push({
            PutRequest: {
                Item: {
                    UserId: user.userId,
                    username: user.username,
                    password: user.password,
                },
            },
        });
    }

    try {
        await dynamoDB.batchWrite(batchWriteParams).promise();
    } catch (error) {
        console.error('Erro ao salvar usuários no DynamoDB:', error);
    }
};

// Função para atualizar um usuário específico
export const updateUser = async (user: User): Promise<void> => {
    const params = {
        TableName: USERS_TABLE,
        Key: { UserId: user.userId },
        UpdateExpression: 'set username = :username, password = :password',
        ExpressionAttributeValues: {
            ':username': user.username,
            ':password': user.password,
        },
    };

    try {
        await dynamoDB.update(params).promise();
    } catch (error) {
        console.error(`Erro ao atualizar o usuário ${user.userId}:`, error);
    }
};

// Função para deletar um usuário específico
export const deleteUser = async (userId: string): Promise<void> => {
    const params = {
        TableName: USERS_TABLE,
        Key: { UserId: userId },
    };

    try {
        await dynamoDB.delete(params).promise();
    } catch (error) {
        console.error(`Erro ao deletar o usuário ${userId}:`, error);
    }
};
