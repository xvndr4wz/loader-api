local folderName = "DumperNdraawz"
if not isfolder(folderName) then
    makefolder(folderName)
end

local fileCount = 0
local function saveCode(code, sourceInfo)
    if not code or #code < 5 then return end 
    
    fileCount = fileCount + 1
    local fileName = "Fetch_Script_" .. tostring(fileCount) .. "_" .. os.time()
    local path = folderName .. "/" .. fileName .. ".lua"
    
    -- Menambahkan baris -- URL : di bawah -- CODE
    local contentToSave = "-- CODE👇 :\n-- URL : " .. (sourceInfo or "Unknown/Local") .. "\n\n" .. code
    
    writefile(path, contentToSave)
    print("🔥 [Ndraawz] BERHASIL FETCH SCRIPT: " .. path)
end

-- HOOK LOADSTRING
local oldLoadstring
oldLoadstring = hookfunction(loadstring, function(source, chunkname)
    if type(source) == "string" then
        task.spawn(function()
            -- Menggunakan chunkname sebagai info sumber
            saveCode(source, chunkname)
        end)
    end
    return oldLoadstring(source, chunkname)
end)

-- HOOK HTTPGET
local oldHttpGet
oldHttpGet = hookfunction(game.HttpGet, function(self, url, ...)
    local content = oldHttpGet(self, url, ...)
    if content then
        task.spawn(function()
            -- Menggunakan url sebagai info sumber
            saveCode(content, url) 
        end)
    end
    return content
end)

print("Ndraawz Is Ready❗️🔥")
