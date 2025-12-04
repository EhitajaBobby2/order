require("dotenv").config();
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

const commands = [
  new SlashCommandBuilder()
    .setName("order")
    .setDescription("Place a new order")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Slash command /order registered.");
  } catch (error) {
    console.error(error);
  }
})();

client.on("clientReady", () => {
  console.log(`${client.user.tag} is online!`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "order") {

    // Step 1: Purchasable items dropdown
    const itemsMenu = new StringSelectMenuBuilder()
      .setCustomId("selectItem")
      .setPlaceholder("Select an item to purchase")
      .addOptions([
        { label: "Decorations", value: "Decorations" },
        { label: "Server Boosts", value: "Server Boosts" },
        { label: "Aged DC Accounts", value: "Aged DC Accounts" },
        { label: "Fortnite Accounts", value: "Fortnite Accounts" },
        { label: "Valorant Accounts", value: "Valorant Accounts" },
        { label: "Nitros", value: "Nitros" },
        { label: "Other", value: "Other" }
      ]);

    await interaction.reply({ 
      content: "What would you like to purchase?", 
      components: [new ActionRowBuilder().addComponents(itemsMenu)],
      ephemeral: true
    });

    const filter = i => i.user.id === interaction.user.id;

    // Step 1 Collector: Item
    const itemCollector = interaction.channel.createMessageComponentCollector({ filter, componentType: 3, time: 600000, max: 1 });
    itemCollector.on("collect", async itemInteraction => {
      const selectedItem = itemInteraction.values[0];

      // Step 2: Payment method
      const paymentMenu = new StringSelectMenuBuilder()
        .setCustomId("selectPayment")
        .setPlaceholder("Select payment method")
        .addOptions([
          { label: "Paypal", value: "Paypal" },
          { label: "Litecoin", value: "Litecoin" }
        ]);

      await itemInteraction.update({ 
        content: `Selected **${selectedItem}**. Now choose your payment method.`, 
        components: [new ActionRowBuilder().addComponents(paymentMenu)] 
      });

      const paymentCollector = interaction.channel.createMessageComponentCollector({ filter, componentType: 3, time: 600000, max: 1 });
      paymentCollector.on("collect", async paymentInteraction => {
        const selectedPayment = paymentInteraction.values[0];

        // Step 3: Quantity
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

        await paymentInteraction.update({ 
          content: `Selected **${selectedPayment}**. Now choose quantity.`, 
          components: [new ActionRowBuilder().addComponents(quantityMenu)] 
        });

        const quantityCollector = interaction.channel.createMessageComponentCollector({ filter, componentType: 3, time: 600000, max: 1 });
        quantityCollector.on("collect", async quantityInteraction => {
          const selectedQuantity = quantityInteraction.values[0];

          await quantityInteraction.update({ 
            content: `✅ Order received!\n**Item:** ${selectedItem}\n**Payment:** ${selectedPayment}\n**Quantity:** ${selectedQuantity}`,
            components: []
          });

          // Step 4: Ping Owner role publicly
          const ownerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
          if (ownerRole) {
            await interaction.channel.send(`📦 **New Order Received!**
**User:** ${interaction.user}
**Item:** ${selectedItem}
**Payment:** ${selectedPayment}
**Quantity:** ${selectedQuantity}
<@&${ownerRole.id}>`);
          } else {
            await interaction.channel.send("Could not find the Owner role to ping.");
          }
        });

      });

    });
  }
});

client.login(process.env.TOKEN);
