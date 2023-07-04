export async function getTurns() {
  const response = await fetch('https://service-627l1630-1251208590.hk.apigw.tencentcs.com/release/api/v1/turn/credentials?apiKey=75f239c76e1f15751a5d2859e196e70f7cf7')
  const iceServers = await response.json()
  return iceServers
}