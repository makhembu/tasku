#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { TaskStore } from './store.js';
import { AI } from './ai.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();
const store = new TaskStore();
const ai = new AI();

program
  .name('tasku')
  .description('AI-powered CLI task manager')
  .version('1.0.0');

program
  .command('add')
  .description('Add a task using natural language')
  .argument('<prompt>', 'natural language task description')
  .action(async (prompt: string) => {
    try {
      console.log(chalk.blue('Processing...'));
      const tasks = await ai.parseTask(prompt);
      for (const task of tasks) {
        store.add(task);
        console.log(chalk.green('Added:') + ` ${task.title}`);
        if (task.labels?.length) {
          console.log(chalk.dim(`  Labels: ${task.labels.join(', ')}`));
        }
        if (task.dueDate) {
          console.log(chalk.dim(`  Due: ${task.dueDate.toLocaleDateString()}`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all tasks')
  .option('-s, --status <status>', 'filter by status (pending|done)')
  .option('-l, --label <label>', 'filter by label')
  .option('-d, --due <date>', 'filter by due date (today|week|YYYY-MM-DD)')
  .action((options) => {
    let tasks = store.list();
    
    if (options.status === 'done') tasks = tasks.filter(t => t.done);
    if (options.status === 'pending') tasks = tasks.filter(t => !t.done);
    if (options.label) tasks = tasks.filter(t => t.labels?.includes(options.label));
    
    if (tasks.length === 0) {
      console.log(chalk.yellow('No tasks found.'));
      return;
    }
    
    console.log(chalk.bold(`\nTasks (${tasks.length}):\n`));
    for (const task of tasks) {
      const status = task.done ? chalk.green('✓') : chalk.yellow('○');
      const priority = task.priority === 'high' ? chalk.red('❗') : task.priority === 'low' ? chalk.dim('↓') : '';
      console.log(`  ${status} ${priority} ${chalk.bold(task.title)}`);
      if (task.labels?.length) console.log(chalk.dim(`     ${task.labels.map(l => '#' + l).join(' ')}`));
      if (task.dueDate) {
        const diff = Math.ceil((task.dueDate.getTime() - Date.now()) / 86400000);
        const dueStr = diff < 0 ? chalk.red(`${Math.abs(diff)}d overdue`) : diff === 0 ? chalk.yellow('today') : chalk.dim(`${diff}d left`);
        console.log(chalk.dim(`     Due: ${task.dueDate.toLocaleDateString()} (${dueStr})`));
      }
      console.log();
    }
  });

program
  .command('done')
  .description('Mark a task as complete by ID')
  .argument('<id>', 'task ID')
  .action((id: string) => {
    const task = store.complete(id);
    if (task) {
      console.log(chalk.green('Completed:') + ` ${task.title}`);
    } else {
      console.log(chalk.red('Task not found:') + ` ${id}`);
    }
  });

program
  .command('delete')
  .description('Delete a task by ID')
  .argument('<id>', 'task ID')
  .action((id: string) => {
    const task = store.delete(id);
    if (task) {
      console.log(chalk.red('Deleted:') + ` ${task.title}`);
    } else {
      console.log(chalk.red('Task not found:') + ` ${id}`);
    }
  });

program
  .command('today')
  .description('Show tasks due today')
  .action(() => {
    const tasks = store.list().filter(t => {
      if (!t.dueDate || t.done) return false;
      const today = new Date();
      return t.dueDate.toDateString() === today.toDateString();
    });
    
    if (tasks.length === 0) {
      console.log(chalk.green('Nothing due today!'));
      return;
    }
    
    console.log(chalk.bold(`\nDue Today (${tasks.length}):\n`));
    for (const task of tasks) {
      console.log(`  ${chalk.yellow('○')} ${chalk.bold(task.title)}`);
      if (task.labels?.length) console.log(chalk.dim(`     ${task.labels.map(l => '#' + l).join(' ')}`));
      console.log();
    }
  });

program.parse();
