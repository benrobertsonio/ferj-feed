import arg from 'arg';
import inquirer from 'inquirer';
import { fetchJobs } from './main';

function parseArgumentsIntoOptions(rawArgs) {
 const args = arg(
   {
     '--yes': Boolean,
     '-y': '--yes',
   },
   {
     argv: rawArgs.slice(2),
   }
 );
 return {
   days: Number(args._[0]),
   skip: args['--yes'] || false,
 };
}

async function promptForMissingOptions(options) {
  const questions = [];
  if (!options.days) {
    questions.push({
      type: 'number',
      name: 'days',
      message: 'How many days of jobs would you like to fetch?',
      default: 1
    })
  }



  const answers = await inquirer.prompt(questions);
  return {
    ...options,
    days: options.days || answers.days,
  };
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  console.log(options);
  await fetchJobs(options);
}
