import fetch from 'node-fetch'
import fs from 'fs'

const baseApi = 'https://sensors-api-uba.herokuapp.com'
const getUrlByPage = (page, pageSize) => `${baseApi}/measurements?datalength=${pageSize}&skip=${(page - 1) * pageSize}`

function* getData(pageSize, pageStart, pageEnd) {
  for(let page = pageStart; page <= pageEnd; page++){
    yield fetch(getUrlByPage(1, pageSize))
      .then(res => res.json())
  }
}

const jsonToCsv = (data) => {
  return data.map(({ sensorid, time, value }) => `${sensorid},${time},${value}`).join('\n')
}

const download = async () => {
  const stream = fs.createWriteStream("measurements.csv", { encoding: 'ASCII'});
  const pageSize = 10
  const { total } = await fetch(`${baseApi}/total`)
    .then(res => res.json())
    .then(totals => totals.reduce(({ total: a }, { total: b }) => ({ total: a + b })))
  const totalPages = Math.ceil(total / pageSize)

  const allCalls = []
  for(const data of getData(pageSize, 1, totalPages)){
    allCalls.push(
      data
        .then(jsonToCsv)
        .then((text) => stream.write(text))
    )
  }
  return Promise.all(allCalls)
    .then(() => stream.close())
}

////////////////////////////////////////////////////////////////

process.stdout.write('\x1Bc')
console.log('downloading')
console.time('download')
download()
  .then(() => {
    process.stdout.write('\x1Bc')
    console.log('downloaded')
  })
  .catch((err) => {
    process.stdout.write('\x1Bc')
    console.error('ERROR:', err)
  })
  .finally(() => {
    console.timeEnd('download')
  })
