module.exports = {

	sleep: function(millis){
		return new Promise(resolve => setTimeout(resolve, millis));
	},

	raiseError: function(obj){
		throw 'ERROR: ' + (obj && obj.errorMessage ? obj.errorMessage : 'Unknown');
	},

	loop: async function(doSth, err, finish, time){

		while(true)
		{
			try{
				doSth();
			}
			catch(e)
			{
				showError(e);
				await err(e);
			}
			finally
			{
				var timeout = await finish();
				await asyncDb && asyncDb.release();
				await sleep(timeout||time);
			}
		}
	}
};