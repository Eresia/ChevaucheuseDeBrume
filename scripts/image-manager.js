import sharp from "sharp";

const scoreWidth = 500;
const scoreHeight = 500;

const basicColors = [[255, 255, 0], [255, 0, 0], [0, 0, 255]];
const combineColor = [[255, 128, 0], [0, 255, 0], [128, 0, 255]];
const completeColor = [[0, 0, 0]];

export async function generateCircleScores(results, nbQuestions)
{
	let background = sharp({create: {width: scoreWidth, height: scoreHeight, channels: 4, background: {r: 255, g: 255, b: 255, alpha: 255}}}).toFormat('png');
	let editedImage = await background.raw().toBuffer({resolveWithObject: true});

	let centerX = Math.floor(scoreWidth * 0.5);
	let centerY = Math.floor(scoreHeight * 0.5);
	let questionSize = (scoreWidth / (nbQuestions + 1)) * 0.5;
	let circleSizes = [];

	for(let i = 0; i < 3; i++)
	{
		circleSizes.push((questionSize * (Math.abs(results[i]) + 1)));
	}

	let realDistances = [Math.abs(results[1] - results[0]), Math.abs(results[2] - results[0]), Math.abs(results[2] - results[1])];
	let averageDistances = [(realDistances[0] + realDistances[1]) * 0.5 * questionSize, (realDistances[0] + realDistances[2]) * 0.5 * questionSize, (realDistances[1] + realDistances[2]) * 0.5 * questionSize];

	let circleCenters = [];
	circleCenters.push({x: centerX - averageDistances[0], y: centerY + averageDistances[0]});
	circleCenters.push({x: centerX + averageDistances[1], y: centerY + averageDistances[1]})
	circleCenters.push({x: centerX, y: centerY - averageDistances[2]});

	for(let i = 0; i < editedImage.data.length; i += 4)
	{
		let x = (i / 4) % (scoreWidth);
		let y = Math.floor((i / 4) / scoreWidth);

		let index = 0;
		let nbCircles = 0;

		for(let j = 0; j < 3; j++)
		{
			let d = Math.sqrt((x - circleCenters[j].x) * (x - circleCenters[j].x) + (y - circleCenters[j].y) * (y - circleCenters[j].y));
			if(d < circleSizes[j])
			{
				index += j;
				nbCircles++;
			}
		}

		let finalArray;

		if(nbCircles == 0)
		{
			continue;
		}
		else if(nbCircles == 3)
		{
			index = 0;
			finalArray = completeColor;
		}
		else if(nbCircles > 1)
		{
			index -= 1;
			finalArray = combineColor;
		}
		else
		{
			finalArray = basicColors;
		}

		editedImage.data[i] = finalArray[index][0];
		editedImage.data[i + 1] = finalArray[index][1];
		editedImage.data[i + 2] = finalArray[index][2];
		editedImage.data[i + 3] = 255;
	}

	let finalImage = sharp(editedImage.data, {raw: editedImage.info}).toFormat('png');
	finalImage.composite([{input: 'images/Legende.png'}]);

	return await finalImage.toBuffer();
}