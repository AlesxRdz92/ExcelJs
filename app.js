const excel = require('./excel');
const yargs = require('yargs');
var apps, server;
const argv = yargs
    .command('start', 'First command to run, the program takes the .xlsx file and filter it to get the needed job streams',{
        apps: {
            describe: 'The applications to migrate provided by Raju',
            demand: true,
            alias: 'a'
        },
        server: {
            describe: 'The server where the job stream will be migrated',
            demand: true,
            alias: 's'
        }
    })
    .help()
    .command('pred', 'Get the job streams\' names to request the definitions to TechBatch Scheduling Tivoli Team and get the predecesors')
    .command('succ', 'Get the successors')
    .argv;
let command = argv._[0];

console.log('You typed the following command: ', command);

switch(command){
    case 'start': 
        apps = argv.apps.split(',');
        server = argv.server;
        excel.start(apps, server);
        break;
    case 'pred':
        excel.pred();
        break;
    case 'succ':
        excel.succ();
        break;
    default: console.log('Command not recognized');
}