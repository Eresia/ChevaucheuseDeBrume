import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

export let allCommands = [];

allCommands.push({
	data: new SlashCommandBuilder()
		.setName('qui-suis-je')
		.setDescription('Quelle classe es tu ?'),

	async execute(interaction, dataManager) {
		dataManager.initGuildData(interaction.guild.id);
		dataManager.WhoAreYouManager.startQuestions(interaction);
	}
});

allCommands.push({
	data: new SlashCommandBuilder()
		.setName('refresh-sheet')
		.setDescription('Refresh Sheet data')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction, dataManager) {
		dataManager.initGuildData(interaction.guild.id);

		await interaction.deferReply({flags: MessageFlags.Ephemeral});

		dataManager.WhoAreYouManager.refreshData();
		await interaction.editReply("Sheet updated!");
	}
});

allCommands.push({
	data: new SlashCommandBuilder()
		.setName('test-scores')
		.setDescription('Test Score Image Generation')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addNumberOption(option => 
			option
				.setName('pouvoir')
				.setDescription('Valeur de Pouvoir')
				.setRequired(true)
		)
		.addNumberOption(option => 
			option
				.setName('volonte')
				.setDescription('Valeur de Volonté')
				.setRequired(true)
		)
		.addNumberOption(option => 
			option
				.setName('creativite')
				.setDescription('Valeur de Créativité')
				.setRequired(true)
		)
		.addIntegerOption(option => 
			option
				.setName('nb-questions')
				.setMinValue(1)
				.setMaxValue(100)
				.setDescription('Simulation du nombre de questions')
				.setRequired(true)
		),

	async execute(interaction, dataManager) {
		dataManager.initGuildData(interaction.guild.id);

		await interaction.deferReply({flags: MessageFlags.Ephemeral});

		let pouvoir = interaction.options.getNumber("pouvoir");
		let volonte = interaction.options.getNumber("volonte");
		let creativite = interaction.options.getNumber("creativite");
		let nbQuestions = interaction.options.getInteger("nb-questions");

		let embed = new EmbedBuilder();
		embed.setDescription("Votre score : ");
		let file = new AttachmentBuilder(await dataManager.ImageManager.generateCircleScores([pouvoir, volonte, creativite], nbQuestions), {name: 'scores.png'});
		embed.setImage('attachment://scores.png');
		
		try
		{
			await interaction.editReply({embeds: [embed], flags: MessageFlags.Ephemeral, files:[file]});
		} catch(error){console.log(error);}
	}
});