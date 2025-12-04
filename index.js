require("dotenv").config();
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel]
});

const validPayments = ["Paypal", "Litecoin"];

client.once("ready", async () => {
    console.log(`${client.user.tag} is online!`);

    const guild = client.guilds.cache.first();
    if (!guild) return console.log("Bot is not in a guild yet.");

    await guild.commands.create({
        name: "order",
        description: "Start a purchase order"
    });

    console.log("Slash command /order registered.");
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "order") return;

    const ownerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
    if (!ownerRole) return interaction.reply("Could not find a role named **Owner**.");

    const itemRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("select_item")
                .setPlaceholder("Select an item to purchase")
                .addOptions([
                    { label: "Decos", value: "decos" },
                    { label: "@ged accs", value: "@ged accs" },
                    { label: "Srvr bst", value: "srvr bst" },
                    { label: "Other", value: "other" }
                ])
        );

    await interaction.reply({ content: "What would you like to purchase?", components: [itemRow], ephemeral: true });

    const collector = interaction.channel.createMessageComponentCollector({ componentType: 3, time: 600000 });

    let order = { item: null, payment: null, quantity: null };

    collector.on("collect", async i => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: "This is not your order!", ephemeral: true });

        if (i.customId === "select_item") {
            order.item = i.values[0];

            const paymentRow = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("select_payment")
                        .setPlaceholder("Select a payment method")
                        .addOptions(validPayments.map(p => ({ label: p, value: p.toLowerCase() })))
                );

            await i.update({ content: `Selected **${order.item}**. Now choose your payment method.`, components: [paymentRow] });
        } else if (i.customId === "select_payment") {
            order.payment = i.values[0];

            const quantityRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId("qty_1").setLabel("1").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("qty_2").setLabel("2").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("qty_3").setLabel("3").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("qty_other").setLabel("Other").setStyle(ButtonStyle.Secondary)
                );

            await i.update({ content: `Payment method: **${order.payment}**. Choose quantity:`, components: [quantityRow] });
        } else if (i.customId.startsWith("qty_")) {
            if (i.customId === "qty_other") {
                await i.reply({ content: "Please type your quantity now.", ephemeral: true });

                const msgFilter = m => m.author.id === interaction.user.id;
                const collected = await interaction.channel.awaitMessages({ filter: msgFilter, max: 1, time: 600000, errors: ['time'] });
                order.quantity = collected.first().content;
            } else {
                order.quantity = i.customId.split("_")[1];
            }

            await i.update({ content: `✅ Order complete!`, components: [] });

            interaction.channel.send(
                `📦 **New Order Received!**\n` +
                `**Item:** ${order.item}\n` +
                `**Payment:** ${order.payment}\n` +
                `**Quantity:** ${order.quantity}\n` +
                `**Notifying:** ${ownerRole.toString()}`
            );

            collector.stop();
        }
    });

    collector.on("end", collected => {
        if (!order.item || !order.payment || !order.quantity) {
            interaction.editReply({ content: "Order cancelled due to timeout or incomplete selection.", components: [] });
        }
    });
});

client.login(process.env.TOKEN);