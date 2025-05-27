import {generateToken} from 'clatter_userbot_api';
import prompt from 'prompt-sync';

var promptSync = prompt();

var email = promptSync("Enter your email: ");
var password = promptSync("Enter your password: ");

var token = await generateToken({email, password});
console.log(token);