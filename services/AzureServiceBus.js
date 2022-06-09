const {ServiceBusAdministrationClient, ServiceBusClient} = require('@azure/service-bus');

class AzureServiceBus {
    #connectionString;
    #name;

    constructor(connectionString, name) {
        this.#connectionString = connectionString;
        this.#name = name;
    }

    get connectionString() {
        return this.#connectionString;
    }

    get name() {
        return this.#name;
    }

}

class AdminServiceBus extends AzureServiceBus {

    constructor(connectionString, name) {
        super(connectionString, name);
    }

    async listSubscriptions(options = {isRuntime: false}) {
        const sbAdmin = new ServiceBusAdministrationClient(this.connectionString);
        let result = [];
        let subs;
        if (options.isRuntime) {
            subs = sbAdmin.listSubscriptionsRuntimeProperties(this.name);
        } else {
            subs = sbAdmin.listSubscriptions(this.name);
        }
        
        for await (const sub of subs) {
            result.push(sub);            
        }
        return result;
    }

    /**
     * get subscription by name
     * @param {string} subsName 
     * @param {object} options 
     * @returns {Promise<import('@azure/service-bus').SubscriptionProperties>|Promise<import('@azure/service-bus').SubscriptionRuntimeProperties>}
     */
    async getSubscription(subsName, options = {isRuntime: false}) {
        const sbAdmin = new ServiceBusAdministrationClient(this.connectionString);
        let sub;
        if (options.isRuntime) {
            sub = await sbAdmin.getSubscriptionRuntimeProperties(this.name, subsName);
        } else {
            sub = await sbAdmin.getSubscription(this.name, subsName);
        }
        return sub;
    }

    /**
     * @param {string} newSubs 
     */
    async createSubscription(newSubs) {
        const sbAdmin = new ServiceBusAdministrationClient(this.connectionString);
        let subs = await sbAdmin.createSubscription(this.name, newSubs);
        return subs;
    }

    async deleteSubscription(subs) {
        const sbAdmin = new ServiceBusAdministrationClient(this.connectionString);
        let deletedSubs = await sbAdmin.deleteSubscription(this.name, subs);
        return deletedSubs;
    }

    async updateSubsConfig(subsObj) {
        const sbAdmin = new ServiceBusAdministrationClient(this.connectionString);
        await sbAdmin.updateSubscription(subsObj);
    }

    async listRules(subs) {
        const sbAdmin = new ServiceBusAdministrationClient(this.connectionString);
        let rulesAsync = sbAdmin.listRules(this.name, subs);
        let rules = [];
        for await (const rule of rulesAsync) {
            rules.push(rule);
        }
        return rules;
    }

    /**
     * 
     * @param {string} subs 
     * @param {Array<Object>} rules 
     */
    async persistRules(subs, rules) {
        const sbAdmin = new ServiceBusAdministrationClient(this.connectionString);
        let promises = [];
        for (let rule of rules) {
            if (await sbAdmin.ruleExists(this.name, subs, rule.name)) {
                promises.push( sbAdmin.updateRule(this.name, subs, rule) );
            } else {
                promises.push( sbAdmin.createRule(this.name, subs, rule.name, rule.filter) );
            }
        }
        await Promise.all(promises);
    }

}

class ClientServiceBus extends AzureServiceBus {
    #subsName;

    constructor(connectionString, name, subsName) {
        super(connectionString, name);
        this.#subsName = subsName;
    }

    async peekMessages(isDeadLetter = false) {
        const sbClient = new ServiceBusClient(this.connectionString);
        let options = isDeadLetter?{subQueueType: "deadLetter"}:{};
        let receiver = sbClient.createReceiver(this.name, this.#subsName, options);
        let peekedMessages = await receiver.peekMessages(10000);
        await receiver.close();
        await sbClient.close();
        return peekedMessages;
    }
}

class SenderServiceBus extends AzureServiceBus {
    constructor(connectionString, name) {
        super(connectionString, name);
    }

    async publish(message, appProps = {}) {
        const sbClient = new ServiceBusClient(this.connectionString);
        const sender = sbClient.createSender(this.name);
        let messageWrapper = {
            body: message, 
            applicationProperties: appProps
        };
        await sender.sendMessages(messageWrapper);
        await sender.close();
        await sbClient.close();
    }
}

module.exports = {
    AdminServiceBus,
    ClientServiceBus,
    SenderServiceBus
}