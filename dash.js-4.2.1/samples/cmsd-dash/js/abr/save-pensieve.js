/* Developed by Abdelhak Bentaleb, National University of Singapore, bentaleb@comp.nus.edu.sg  */
async function saveModel(){
	const MODEL_URL = 'pensieve/model.json';
	let model;
	// console.time("Reading model from server...");
	const modelLists = await tf.io.listModels();
	// console.log(modelLists);

	if ("indexeddb://pensieve" in modelLists)
	{
		console.log("model exists in the local storage");
	} else {
		console.log("model does not exist in the local storage");
		model = await tf.loadModel(MODEL_URL);
		const saveResult = await model.save('indexeddb://pensieve');
		console.log(saveResult);
	}
	console.log("model ready");
}

saveModel();
