require("dotenv").config();
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder, Routes } = require("discord.js");
const { REST } = require("@discordjs/rest");
const express = require("express");

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const rest = new REST({ version: "10" }).setToken(TOKEN);

// Register slash command
const commands = [
    new SlashCommandBuilder()
        .setName("order")
        .setDescription("Place an order")
        .toJSON()
];

(async () => {
    try {
        console.log("Registering slash commands...");
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log("Slash command /order registered.");
    } catch (err) {
        console.error(err);
    }
})();

client.once("clientReady", () => {
    console.log(`${client.user.tag} is online!`);
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "order") return;

    const itemMenu = new StringSelectMenuBuilder()
        .setCustomId("select_item")
        .setPlaceholder("Choose an item")
        .addOptions([
            { label: "Decorations", value: "Decorations" },
            { label: "Server Boosts", value: "Server Boosts" },
            { label: "Aged DC Accounts", value: "Aged DC Accounts" },
            { label: "Fortnite Accounts", value: "Fortnite Accounts" },
            { label: "Valorant Accounts", value: "Valorant Accounts" },
            { label: "Nitros", value: "Nitros" },
            { label: "Other", value: "Other" }
        ]);

    const row = new ActionRowBuilder().addComponents(itemMenu);

    await interaction.reply({ content: "What would you like to purchase?", components: [row], ephemeral: true });

    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 600_000
    });

    let order = { item: null, payment: null, quantity: null };

    collector.on("collect", async i => {
        if (i.customId === "select_item" && !order.item) {
            order.item = i.values[0];

            const paymentMenu = new StringSelectMenuBuilder()
                .setCustomId("select_payment")
                .setPlaceholder("Choose payment method")
                .addOptions([
                    { label: "Paypal", value: "Paypal" },
                    { label: "Litecoin", value: "Litecoin" }
                ]);

            await i.update({ content: `Selected **${order.item}**. Now choose your payment method:`, components: [new ActionRowBuilder().addComponents(paymentMenu)] });
        } else if (i.customId === "select_payment" && !order.payment) {
            order.payment = i.values[0];

            const quantityMenu = new StringSelectMenuBuilder()
                .setCustomId("select_quantity")
                .setPlaceholder("Choose quantity range")
                .addOptions([
                    { label: "1-5", value: "1-5" },
                    { label: "5-10", value: "5-10" },
                    { label: "10-15", value: "10-15" },
                    { label: "15-20", value: "15-20" },
                    { label: "20-30", value: "20-30" },
                    { label: "30+", value: "30+" }
                ]);

            await i.update({ content: `Selected **${order.payment}**. Now choose quantity:`, components: [new ActionRowBuilder().addComponents(quantityMenu)] });
        } else if (i.customId === "select_quantity" && !order.quantity) {
            order.quantity = i.values[0];

            const ownerRole = i.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");

            await i.update({
                content: `📦 **New Order Received!**\n**Item:** ${order.item}\n**Payment:** ${order.payment}\n**Quantity:** ${order.quantity}\n${ownerRole ? `<@&${ownerRole.id}>` : "Owner role not found."}`,
                components: []
            });

            collector.stop();
        }
    });

    collector.on("end", collected => {
        if (!order.item || !order.payment || !order.quantity) {
            interaction.editReply({ content: "Order cancelled due to timeout.", components: [] });
        }
    });
});

client.login(TOKEN);

// --- Express server for Render ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running!"));

app.listen(PORT, () => console.log(`Web server listening on port ${PORT}`));
