import navigationBar from "../../mocks/navigationBar.json"

export default defineEventHandler((event) => {
  return {
    data: navigationBar.sort((a, b) => a.id - b.id),
    code: 200,
    message: "success"
  }
})
