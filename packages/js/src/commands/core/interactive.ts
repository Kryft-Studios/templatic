import * as  inquirer from "@inquirer/prompts";
export class Interactive {
    constructor(public allowed: boolean){}
    async prompt(ques: string, required: boolean = false){
        if(!this.allowed)return undefined;
        return await inquirer.input({message: ques, required});
    }
}