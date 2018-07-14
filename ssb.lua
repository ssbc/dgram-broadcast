-- [@micro](@wsoeSOhEE3yAIEF1gTVMeStUWnoejIz1P6a3lnvjaOM=.ed25519)'s very hacky ssb broadcast protocol decoder
-- cp ssb.lua ~/.config/wireshark/plugins/
local ssb_protocol = Proto("ssb", "Scuttlebutt Peer Advertisement")

local f_ip = ProtoField.string("ssb.peer_ip", "Peer IP")
local f_port = ProtoField.string("ssb.peer_port", "Peer Port")
local f_key = ProtoField.string("ssb.peer_key", "Peer Key")

ssb_protocol.fields = { f_ip, f_port, f_key }

local data_dis = Dissector.get("data")

function string:split(sep)
   local sep, fields = sep or ":", {}
   local pattern = string.format("([^%s]+)", sep)
   self:gsub(pattern, function(c) fields[#fields+1] = c end)
   return fields
end

function ssb_protocol.dissector(buffer, pinfo, tree)
    length = buffer:len()
    if length == 0 then return end

    pinfo.cols.protocol = ssb_protocol.name

    local subtree = tree:add(ssb_protocol, buffer())
    local parts = buffer():string():split()
    local net = parts[1]
    local ip = parts[2]
    local shs = parts[3]
    local publickey = parts[4]

    local port = parts[3]:split("~")[1]
    local length = 1
    length = length + net:len()

    subtree:add(f_ip, buffer(length, ip:len()))
    length = length + ip:len() + 1

    subtree:add(f_port, buffer(length, port:len()))
    length = length + shs:len() + 1

    subtree:add(f_key, buffer(length, publickey:len()))

    subtree:append_text(", IP: " .. ip .. ", Port: " .. port .. ", Key: " .. publickey)
end

local udp_encap_table = DissectorTable.get("udp.port")
udp_encap_table:add(8008, ssb_protocol)
