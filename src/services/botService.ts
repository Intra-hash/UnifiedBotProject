import { Client, GatewayIntentBits, ChannelType, Message } from 'discord.js';
import { readUsers, saveUsers } from './dynamoService';
import bcrypt from 'bcrypt';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

const messageCount: Record<string, Record<number, number>> = {};
const voiceParticipation: Record<string, Record<number, { entries: number; totalDuration: number; joinTime: number | null }>> = {};
const ALLOWED_ROLEID = process.env.ALLOWED_ROLEID as string;
const AUTH_ROLE_ID = process.env.AUTH_ROLE_ID as string;
const AUTH_CHANNEL_ID = process.env.AUTH_CHANNEL_ID as string;
const BOT_AUTHOR_ID = process.env.BOT_AUTHOR_ID as string;

const modules: Record<string, string> = {
    "modulo1": "http://link-para-o-modulo1.com",
    "modulo2": "http://link-para-o-modulo2.com",
    "modulo3": "http://link-para-o-modulo3.com",
};

// Função para inicializar o bot e definir eventos
export const initializeBot = (): void => {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}`);
    });

    client.on('messageCreate', async (message) => {
        if (message.author.id !== BOT_AUTHOR_ID) {
            if (message.channel.id === AUTH_CHANNEL_ID) {
                await handleAuthCommand(message);
            } else if (message.channel.type === ChannelType.DM) {
                await handleDM(message);
            } else {
                monitorMessages(message);
            }
        }
    });

    client.on('voiceStateUpdate', (oldState, newState) => {
        monitorVoiceParticipation(oldState, newState);
    });

    client.login(process.env.SECRET_KEY as string);
};

// Função para tratar comandos de autenticação no canal de autenticação
const handleAuthCommand = async (message: Message): Promise<void> => {
    const [command] = message.content.split(' ');
    let users = await readUsers();

    if (command === '!register') {
        if (users[message.author.id]) {
            message.channel.send("Você já está registrado.");
            return;
        }

        try {
            await message.author.send("Por favor, digite seu nome de usuário e senha no formato: `<username> <password>` na DM.");
            message.channel.send("Uma mensagem foi enviada para sua DM para concluir seu registro.");
        } catch (error) {
            console.error('Erro ao enviar mensagem na DM:', error);
            message.channel.send("Não consegui enviar uma mensagem na sua DM. Certifique-se de que suas DMs estão abertas e tente novamente.");
        }
    } else if (command === '!login') {
        const [_, username, password, module] = message.content.split(' ');
        if (!username || !password) {
            message.channel.send("Por favor, forneça um nome de usuário e uma senha. Uso: `!login <username> <password> <module>`");
            return;
        }

        if (users[message.author.id]) {
            try {
                const validPassword = await bcrypt.compare(password, users[message.author.id].password);
                if (validPassword) {
                    const member = message.guild?.members.cache.get(message.author.id);
                    if (member) {
                        try {
                            await member.roles.add(AUTH_ROLE_ID);
                            console.log(`Cargo "Authenticated" adicionado a ${member.user.tag}`);
                        } catch (error) {
                            console.error(`Erro ao adicionar cargo a ${member.user.tag}:`, error);
                            message.channel.send("Ocorreu um erro ao adicionar o cargo. Entre em contato com um administrador.");
                            return;
                        }
                    }

                    if (module && modules[module]) {
                        message.channel.send(`Aqui está o link para o módulo ${module}: ${modules[module]}`);
                        return;
                    } else {
                        message.channel.send("Por favor, especifique um módulo válido que deseja acessar.");
                    }
                } else {
                    message.channel.send("Senha incorreta.");
                }
            } catch (error) {
                console.error('Erro ao fazer login:', error);
                message.channel.send("Ocorreu um erro ao fazer login. Tente novamente.");
            }
        } else {
            message.channel.send("Usuário não encontrado.");
        }
    }
};

// Função para tratar mensagens diretas (DM)
const handleDM = async (message: Message): Promise<void> => {
    const args = message.content.split(' ');
    if (args.length < 2) {
        message.channel.send("Por favor, forneça um nome de usuário e uma senha no formato: `<username> <password>`");
        return;
    }

    const [username, password] = args;
    let users = await readUsers();

    if (!users[message.author.id]) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            users[message.author.id] = { userId: message.author.id, username, password: hashedPassword };
            await saveUsers(users);
            message.channel.send(`Usuário registrado com sucesso! Bem-vindo, ${username}.`);
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            message.channel.send("Ocorreu um erro ao registrar o usuário. Tente novamente.");
        }
    } else {
        message.channel.send("Você já está registrado.");
    }
};

// Função para monitorar a contagem de mensagens
const monitorMessages = (message: Message): void => {
    if (!message.guild) return;

    const userId = message.author.id;
    const currentMonth = new Date().getMonth() + 1;

    if (!messageCount[userId]) {
        messageCount[userId] = {};
    }

    if (messageCount[userId][currentMonth]) {
        messageCount[userId][currentMonth]++;
    } else {
        messageCount[userId][currentMonth] = 1;
    }

    console.log(`Messages by ${message.author.tag}: ${messageCount[userId][currentMonth]}`);
};

// Função para monitorar participação em canais de voz
const monitorVoiceParticipation = (oldState: any, newState: any): void => {
    const userId = newState.id;
    const currentMonth = new Date().getMonth() + 1;

    if (!voiceParticipation[userId]) {
        voiceParticipation[userId] = {};
    }

    if (!voiceParticipation[userId][currentMonth]) {
        voiceParticipation[userId][currentMonth] = {
            entries: 0,
            totalDuration: 0,
            joinTime: null,
        };
    }

    if (!oldState.channel && newState.channel) {
        voiceParticipation[userId][currentMonth].entries++;
        voiceParticipation[userId][currentMonth].joinTime = Date.now();
        console.log(`${newState.member.user.tag} entrou em ${newState.channel.name}`);
    } else if (oldState.channel && !newState.channel) {
        if (voiceParticipation[userId][currentMonth].joinTime) {
            const duration = (Date.now() - voiceParticipation[userId][currentMonth].joinTime!) / 1000;
            voiceParticipation[userId][currentMonth].totalDuration += duration;
            voiceParticipation[userId][currentMonth].joinTime = null;
            console.log(`${newState.member.user.tag} saiu de ${oldState.channel.name}. Duração: ${duration.toFixed(2)} segundos`);
        }
    }
};

// Função para gerar relatórios de engajamento
export const generateReport = (message: Message): void => {
    if (!message.member?.roles.cache.has(ALLOWED_ROLEID)) {
        message.reply("Você não tem permissão para usar este comando.");
        return;
    }

    const currentMonth = new Date().getMonth() + 1;
    let report = 'Reporte de engajamento:\n';

    for (const [userId, data] of Object.entries(voiceParticipation)) {
        if (data[currentMonth]) {
            report += `<@${userId}>: Entradas: ${data[currentMonth].entries}, Duração Total: ${data[currentMonth].totalDuration.toFixed(2)} segundos\n`;
        }
    }
    
    for (const [userId, months] of Object.entries(messageCount)) {
        if (months[currentMonth]) {
            report += `<@${userId}>: Mensagens: ${months[currentMonth]}\n`;
        }
    }

    for (const [userId] of Object.entries(messageCount)) {
        const member = message.guild?.members.cache.get(userId);
        const joinedTimestamp = member?.joinedAt;
        if (joinedTimestamp) {
            report += `<@${userId}>: Data de entrada no servidor: ${joinedTimestamp.toISOString()}\n`;
        }
    }

    message.channel.send(report);
};
