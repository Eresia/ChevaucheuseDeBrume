import fs from 'fs';
import https from 'https';
import { MessageFlags, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import * as DiscordUtils from './discord-utils.js'

const TYPES = 
{
	POUVOIR : 0,
	VOLONTE : 1,
	CREATIVITE : 2
}

const VOCATIONS = 
{
	GUER : 0,
	DESS : 1,
	REVE : 2,
	MARC : 3,
	SCUL : 4,
	CHAN : 5,
	ATTR : 6,
	UNKNOWN : 7
}

const fastQuestions = 10
const mediumQuestions = 30

let DataManager;
let questions = [];
let vocationData = [];

export async function init(dataManager)
{
	DataManager = dataManager;
	await refreshData();
}

export async function refreshData()
{
	const sheetInfos = JSON.parse(fs.readFileSync('./sheet.json'));
	//const sheet = 'https://docs.google.com/spreadsheets/d/' + sheetInfos.token + '/gviz/tq?tqx=out:json&tq&gid=' + sheetInfos.gid;
	const sheet = `https://sheets.googleapis.com/v4/spreadsheets/${sheetInfos.token}/values/${sheetInfos.questionPage}?key=AIzaSyAwaXGDfOOdUX-YaGIn0S8Q7ae-ONC_cLs`;

	await new Promise(function(revolve)
	{
		https.get(sheet, function(res)
		{
			let data = ''
			let json;

			res.on('data', function(stream) {
				data += stream;
			});
			res.on('end', function() {
				//var jsonString = data.match(/(?<="table":).*(?=}\);)/g)[0];
				json = JSON.parse(data);
				let finalString = JSON.stringify(json, null, 4);
				fs.writeFileSync("types.json", finalString);

				let list = json["values"];
				questions = [];

				let index = 1;

				while(index < list.length)
				{
					if(list[index].length != 1)
					{
						index++;
						continue;
					}

					let newQuestions = {};

					newQuestions.question = list[index][0];
					index++;
					
					newQuestions.answers = [];

					while(index < list.length && list[index].length == 5)
					{
						let newAnswer = {};
						newAnswer.text = list[index][1];
						newAnswer.scores = [];

						for(let i = 2; i < 5; i++)
						{
							newAnswer.scores.push(parseFloat(list[index][i]));
						}

						newQuestions.answers.push(newAnswer);
						index++;
					}

					questions.push(newQuestions);
				}

				revolve();
			});
		});
	});

	const resultSheet = `https://sheets.googleapis.com/v4/spreadsheets/${sheetInfos.token}/values/${sheetInfos.resultPage}?key=AIzaSyAwaXGDfOOdUX-YaGIn0S8Q7ae-ONC_cLs`;

	await new Promise(function(revolve)
	{
		https.get(resultSheet, function(res)
		{
			let data = ''
			let json;

			res.on('data', function(stream) {
				data += stream;
			});
			res.on('end', function() {
				//var jsonString = data.match(/(?<="table":).*(?=}\);)/g)[0];
				json = JSON.parse(data);
				let finalString = JSON.stringify(json, null, 4);
				fs.writeFileSync("result.json", finalString);

				let list = json["values"];
				vocationData = [];

				for(let i = 1; i < list.length; i++)
				{
					if(list[i].length != 3)
					{
						continue;
					}
					
					let voc = {};
					voc.name = list[i][0];
					voc.description = list[i][1];
					voc.imgUrl = list[i][2];

					vocationData.push(voc);
				}

				revolve();
			});
		});
	});

	/*for(let i = 0; i < vocationData.length; i++)
	{
		await new Promise(function(revolve)
		{
			https.get(vocationData[i].imgUrl, function(res)
			{
				let data = ''

				res.on('data', function(stream) {
					data += stream;
				});
				res.on('end', function() {
					vocationData[i].imgBuffer = data;
					revolve();
				});
			});
		});
	}*/
}

export async function startQuestions(interaction)
{
	try
	{
		await interaction.deferReply({flags: MessageFlags.Ephemeral});
	}
	catch
	{
		return;
	}

	let author = { name: await DiscordUtils.getUserNameById(interaction.guild, interaction.user.id), iconURL: interaction.user.avatarURL()};

	let initDescription = `Combien de questions voulez vous ?\n\nRapide : ${fastQuestions} questions\n`/*Moyenne : ${mediumQuestions} questions\n*/ + `Longue : Toutes les questions (${questions.length})`;
	let initButtons = [{customId: "fast", label: "Rapide"}, /*{customId: "medium", label: "Moyenne"},*/ {customId: "huge", label: "Longue"}];
	let initEmbed = generateEmbedAndButtons("", author, initDescription, initButtons);

	const collectorFilter = i => i.user.id === interaction.user.id;
	
	let confirmation;

	try
	{
		let response = await interaction.editReply({embeds: [initEmbed.embed], components: [initEmbed.actionRow], withResponse: true, flags: MessageFlags.Ephemeral});
		confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });
	}
	catch
	{
		await sendError(interaction, 'Délai de deux minutes dépassé, test annulé.');
		return;
	}

	let questionsToSend = [...questions];
	shuffle(questionsToSend);

	switch(confirmation.customId)
	{
		case 'fast':
		{
			questionsToSend = questionsToSend.slice(0, fastQuestions);
			break;
		}
		case 'medium':
		{
			questionsToSend = questionsToSend.slice(0, mediumQuestions);
			break;
		}
		case 'huge':
		{
			break;
		}
		default:
		{
			await sendError(interaction, "Test annulé");
			return;
		}
	}

	let results = [0, 0, 0];

	for(let i = 0; i < questionsToSend.length; i++)
	{
		let embed = generateQuestion(`Question ${i + 1}/${questionsToSend.length}`, author, questionsToSend[i]);
		
		try
		{
			let response = await confirmation.update({embeds: [embed.embed], components: [embed.actionRow], withResponse: true, flags: MessageFlags.Ephemeral});
			confirmation = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });
		}
		catch(error)
		{
			await sendError(interaction, 'Délai de deux minutes dépassé, test annulé.');
			return;
		}

		if(confirmation.customId == 'cancel')
		{
			await sendError(interaction, "Test annulé");
			return;
		}
		else
		{
			results[TYPES.POUVOIR] += questionsToSend[i].answers[parseInt(confirmation.customId)].scores[TYPES.POUVOIR];
			results[TYPES.CREATIVITE] += questionsToSend[i].answers[parseInt(confirmation.customId)].scores[TYPES.CREATIVITE];
			results[TYPES.VOLONTE] += questionsToSend[i].answers[parseInt(confirmation.customId)].scores[TYPES.VOLONTE];
		}
	}

	await confirmation.deferUpdate({flags: MessageFlags.Ephemeral});

	let finalEmbed = await generateResult(results, questionsToSend.length, author);
	let finalResponse;
	let button = new ButtonBuilder().setCustomId("public").setLabel("Montrer à toustes").setStyle(ButtonStyle.Primary);
	
	try
	{
		finalResponse = await confirmation.editReply({embeds: finalEmbed.embeds, components: [new ActionRowBuilder().addComponents(button)], withResponse: true, flags: MessageFlags.Ephemeral, files: finalEmbed.files})
		confirmation = await finalResponse.awaitMessageComponent({ filter: collectorFilter, time: 120_000 });
	}
	catch
	{
		return;
	}

	try
	{
		await interaction.channel.send({embeds: finalEmbed.embeds, files: finalEmbed.files});
		await confirmation.update({components: [], withResponse: false});
	}
	catch(error)
	{
		console.error(error);
	}
	
}

function generateQuestion(title, author, data)
{
	let description = data.question.replaceAll('\n', '') + "\n\n";
	let answers = [];

	for(let i = 0; i < data.answers.length; i++)
	{
		answers.push(i);
	}

	shuffle(answers);

	let buttons = [];

	for(let i = 0; i < answers.length; i++)
	{
		description += `- ${i + 1} : ${data.answers[answers[i]].text.replaceAll('\n', '')}\n`;
		buttons.push({label: (i + 1).toString(), customId: answers[i].toString()})
	}

	return generateEmbedAndButtons(title, author, description, buttons);
}

function generateEmbedAndButtons(title, author, description, buttons)
{
	let embed = new EmbedBuilder();

	if(title.length > 0)
	{
		embed.setTitle(title);
	}

	embed.setAuthor(author);
	embed.setDescription(description);

	let actionRow = new ActionRowBuilder();

	for(let i = 0; i < buttons.length; i++)
	{
		actionRow.addComponents(new ButtonBuilder().setCustomId(buttons[i].customId).setLabel(buttons[i].label).setStyle(ButtonStyle.Primary));
	}

	actionRow.addComponents(new ButtonBuilder().setCustomId('cancel').setLabel('Annuler').setStyle(ButtonStyle.Danger));

	return {embed, actionRow};
}

async function generateResult(results, nbQuestions, author)
{
	let mainEmbed = new EmbedBuilder().setURL('https://lepesant.me');
	mainEmbed.setAuthor(author);

	let file = new AttachmentBuilder(await DataManager.ImageManager.generateCircleScores(results, nbQuestions), {name: 'result.png'});
	let scoreEmbed = new EmbedBuilder().setURL('https://lepesant.me').setImage('attachment://result.png');

	let vocIndex = getVocationIndex(results, nbQuestions);

	if(vocIndex == VOCATIONS.UNKNOWN)
	{
		mainEmbed.setDescription(`Vous êtes... En dehors des cases. Mais qui êtes vous donc... ?`);
		return {embeds: [mainEmbed, scoreEmbed], files: []};
	}

	let vocation = vocationData[vocIndex];

	mainEmbed.setImage(vocation.imgUrl);
	mainEmbed.setDescription(`Vous êtes un·e ${vocation.name} !\n\n${vocation.description}`);

	return {embeds: [mainEmbed, scoreEmbed], files: [file]};
}

function getVocationIndex(results, nbQuestions)
{
	let pouvoir = results[TYPES.POUVOIR];
	let creativite = results[TYPES.CREATIVITE];
	let volonte = results[TYPES.VOLONTE];

	let diffPC = Math.abs(creativite - pouvoir);
	let diffPV = Math.abs(volonte - pouvoir);
	let diffCV = Math.abs(volonte - creativite);

	let smallDiff = Math.floor(nbQuestions / 5);
	let mediumDiff = Math.floor(nbQuestions / 2);

	if(diffPC <= smallDiff && diffPV < smallDiff && diffCV < smallDiff)
	{
		return VOCATIONS.DESS;
	}

	if(pouvoir - creativite > mediumDiff && pouvoir - volonte > mediumDiff)
	{
		return VOCATIONS.GUER;
	}

	if(volonte - pouvoir > mediumDiff && volonte - creativite > mediumDiff)
	{
		return VOCATIONS.REVE;
	}

	if(creativite - pouvoir > mediumDiff && creativite - volonte > mediumDiff)
	{
		return VOCATIONS.MARC;
	}

	if(pouvoir >= creativite && volonte >= creativite)
	{
		return VOCATIONS.ATTR;
	}

	if(pouvoir >= volonte && creativite >= volonte)
	{
		return VOCATIONS.CHAN;
	}

	if(volonte >= pouvoir && creativite >= pouvoir)
	{
		return VOCATIONS.SCUL;
	}

	return VOCATIONS.UNKNOWN;
}

async function sendError(interaction, error)
{
	try
	{
		await interaction.editReply({embeds: [new EmbedBuilder().setDescription(error)], components: [], withResponse: false, flags: MessageFlags.Ephemeral});
	}
	catch{}
}

function shuffle(array) 
{
	for (let i = array.length - 1; i > 0; i--) 
	{
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}