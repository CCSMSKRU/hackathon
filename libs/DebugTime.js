const moment = require('moment')
const funcs = require('./functions')

class DebugTime {
    constructor() {
        this.id = funcs.guidShort()
        this.t0 = moment()
        this.t1 = moment()
        this.t2 = moment()

    }

    log(text) {
        this.t2 = moment()
        console.log(`DEBUG TIME (${this.id}):${text}`, this.t2.diff(this.t1), 'FULL:', this.t2.diff(this.t0))
        this.t1 = moment()
    }
}


module.exports = DebugTime
