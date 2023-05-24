
import {assert} from 'chai'
import Logger from '../index.js'
import VError from 'verror'

describe('basic', () => {
  it(`stdout`, async () => {
    const sut = Logger.create('test1', {targets: [{type: 'stdout'}]})
    
    sut.debug('debug message')
    sut.info('info message')
    sut.warn('warn message')
    sut.error('error message')
  })

  it('errors', async () => {
    const sut = Logger.create('test1', {targets: [{type: 'stdout'}]})
    
    sut.error(new Error('error !'))


    const err = new Error('Inner Error')
    sut.error(new VError(err, 'Outer Error'))
  })  
})


