const excel = require('exceljs');
const workbook = new excel.Workbook();
const fs = require('fs');
var column = [], all = [];
var jobsStreams, scripts = './files/pred/', streams = './files/streams.json/', migrations = './files/migratioServer.json', succFiles = './files/succ/';
const fileName = './files/Tivoli_Job.xlsx';  //'./files/Tivoli_Job.xlsx'
const fileJobStreams = './files/jobs.json';
const sheet = 'Data';  //Data
const _ = require('lodash');
const LineReader = require('line-by-line');

class jobStream {
    constructor(name, server, jobs) {
        this.name = name;
        this.server = server;
        this.jobs = jobs;
    }
}

class job extends jobStream {
    constructor(name, server, jobStream) {
        super(name, server);
        this.jobStream = jobStream;
    }
}

class jobParent extends jobStream {
    constructor(name, predecessors, successors) {
        super(name);
        this.predecessors = predecessors;
        this.successors = successors;
    }
}

function lines(file, n) {
    let lr, prev = 'prev', jETemp, jTemp, pred = [], f1 = false, jo = [], f2 = true;
    lr = new LineReader(`${scripts}${file}`);
    lr.on('line', function (line) {
        if (line.includes('SCHEDULE') && f2) {
            jETemp = line.split(' ')[1].split('#');
            f2 = false;
        }
        if (line.includes('SCRIPTNAME')) {
            jTemp = prev.split('#')[1];
            f1 = true;
            pred = [];
        }
        if (line.includes('FOLLOWS') && f1) {
            if (line.includes('#')) {
                let imp = line.split(' ')[2].split('#');
                pred.push(new job(imp[1].split('.')[1], imp[0], imp[1].split('.')[0]));
            } else {
                pred.push(new job(line.split(' ')[2], jETemp[0], jETemp[1]));
            }
        }
        if (line === '' && f1) {
            jo.push(new jobParent(jTemp, pred, []));
        }
        prev = line;
    });

    lr.on('end', function () {
        all.push(new jobStream(jETemp[1], jETemp[0], jo));
        if (all.length === n) {
            saveFile(all, streams);
            all.forEach(stream => {
                console.log(`For the ${stream.name} stream you have to check the following job's successors at Tivoli`);
                stream.jobs.forEach((jobParent) => {
                    console.log(jobParent.name);
                });
                console.log('\n');
            });
        }
    });
}

function readSucc(file) {
    let index = 0, index2 = 0;
    for (let i in all) {
        if (all[i].name === file.split('.')[0])
            break
        else
            index++;
    }
    lr = new LineReader(`${succFiles}${file}`);
    lr.on('line', function (line) {
        if (line.includes('*')) {
            for(let i in all[index].jobs){
                if(all[index].jobs[i].name === line.split('*')[1])
                    break;
                else
                    index2++;
            }
        } else {
            all[index].jobs[index2].successors.push(new job(line.split(' ')[0], line.split(' ')[1], line.split(' ')[2]));
        }
    });
    lr.on('end', function (){
        saveFile(all, streams);
    });
}

function saveFile(arr, file) {
    fs.writeFileSync(file, JSON.stringify(arr));
}

function fetchJobs(file) {
    try {
        return JSON.parse(fs.readFileSync(file));
    } catch (e) {
        console.log(`There was a problem :( this is the error: ${e}`);
    }
}

var start = (apps, server) => {
    console.log('Application is running');
    workbook.xlsx.readFile(fileName).then(() => {
        var worksheet = workbook.getWorksheet(sheet);
        var temp = worksheet.getColumn(2); //2
        let i;
        console.log('Reading cells');
        temp.eachCell({ includeEmpty: false }, (cell) => {
            i = cell._value.value.split(" ")[0];
            for (let j in apps) {
                if (i.includes(apps[j])) {
                    column.push(i);
                    continue
                }
            }
        });
        jobsStreams = _.uniq(column);
        saveFile(jobsStreams, fileJobStreams);
        saveFile(server, migrations);
        console.log('You have to request to TechBatch Scheduling Tivoli Team the following Job Streams\' definitions: \n');
        jobsStreams.forEach((el, i) => console.log(`${i + 1}.- ${el}`));
    });
}

var pred = () => {
    jobsStreams = fetchJobs(fileJobStreams);
    var files = fs.readdirSync(scripts);
    for (let i in files) {
        for (let j in jobsStreams) {
            if (files[i].includes(jobsStreams[j])) {
                lines(files[i], files.length);
                continue
            }
        }
    }
}

var succ = () => {
    all = fetchJobs(streams);
    jobsStreams = fetchJobs(fileJobStreams);
    var files = fs.readdirSync(succFiles);
    //Uncomment the following code block 
    /*for(let i in files){
        for(let j in jobsStreams){
            if(files[i].includes(jobsStreams[j])){
                readSucc(files[i]);
                continue
            }
        }
    }*/
    readSucc('EICST_OPSRP1_DL2.txt');
}

module.exports = {
    start,
    pred,
    succ
}