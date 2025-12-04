require("dotenv").config();
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

const token = process.env.TOKEN;

client.once(Events.ClientReady, async () => {
  console.log(`${client.user.tag} is online!`);

  // Register slash command
  const commands = [
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("Start an order process")
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(token);
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash command /order registered.");
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "order") {
    // Step 1: Choose item
    const itemMenu = new StringSelectMenuBuilder()
      .setCustomId("selectItem")
      .setPlaceholder("Select an item")
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

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 });

    let selectedItem = "";
    let selectedPayment = "";
    let selectedQuantity = "";

    collector.on("collect", async i => {
      if (i.customId === "selectItem") {
        selectedItem = i.values[0];

        // Step 2: Payment method buttons
        const paymentRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("Paypal").setLabel("Paypal").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("Litecoin").setLabel("Litecoin").setStyle(ButtonStyle.Secondary)
        );

        await i.update({ content: `Selected **${selectedItem}**. Now choose your payment method.`, components: [paymentRow] });
      }

      if (i.isButton()) {
        selectedPayment = i.customId;

        // Step 3: Quantity selection
        const quantityMenu = new StringSelectMenuBuilder()
          .setCustomId("selectQuantity")
          .setPlaceholder("Select quantity")
          .addOptions([
            { label: "1-5", value: "1-5" },
            { label: "5-10", value: "5-10" },
            { label: "10-15", value: "10-15" },
            { label: "15-20", value: "15-20" },
            { label: "20-30", value: "20-30" },
            { label: "30+", value: "30+" }
          ]);

        const quantityRow = new ActionRowBuilder().addComponents(quantityMenu);
        await i.update({ content: `Payment method **${selectedPayment}** selected. Choose quantity:`, components: [quantityRow] });
      }

      if (i.customId === "selectQuantity") {
        selectedQuantity = i.values[0];
        collector.stop();

        const ownerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");

        await i.update({
          content: `📦 **New Order Received!**\n**Item:** ${selectedItem}\n**Payment:** ${selectedPayment}\n**Quantity:** ${selectedQuantity}\n${ownerRole ? `<@&${ownerRole.id}>` : ""}`,
          components: []
        });
      }
    });

    collector.on("end", collected => {
      if (!selectedQuantity) {
        interaction.followUp({ content: "Order cancelled: timeout.", ephemeral: true });
      }
    });
  }
});

client.login(token);
