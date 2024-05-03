// Class peristence writes to disk state information of the traffic lights
const fs = require('fs');

class Persistence
{
    constructor()
    {
    }

    static write(name, data)
    {
        let path =  name + '.json';
        fs.writeFileSync(path, JSON.stringify(data));
    }

    static read(name)
    {
        let path =  name + '.json';
        if(fs.existsSync(path))
        {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        }
        return null;
    }

    static append(name, data)
    {
        let savedData = this.read(name);
        if(savedData)
        {
            data = {...savedData, ...data};
        }
        this.write(name, data);
    }
}

module.exports = Persistence;