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
   for w in (self .. sep):gmatch("([^" .. sep .. "]*)" .. sep) do
     table.insert(fields, w)
   end
   return fields
end

function ssb_protocol.dissector(buffer, pinfo, tree)
    length = buffer:len()
    if length == 0 then return end

    pinfo.cols.protocol = ssb_protocol.name

    local subtree = tree:add(ssb_protocol, buffer())
    local net, shs = table.unpack(buffer():string():split("~"))
    local network = net:split()
    local proto = table.remove(network, 1)
    local port = table.remove(network)
    local ip = table.concat(network, ":")
    local prefix, key = table.unpack(shs:split())

    local length = proto:len() + 1

    subtree:add(f_ip, buffer(length, ip:len()))
    length = length + ip:len() + 1

    subtree:add(f_port, buffer(length, port:len()))
    length = length + port:len() + 1
    length = length + prefix:len() + 1

    subtree:add(f_key, buffer(length, key:len()))

    subtree:append_text(", IP: " .. ip .. ", Port: " .. port .. ", Key: " .. key)
end

local udp_encap_table = DissectorTable.get("udp.port")
udp_encap_table:add(8008, ssb_protocol)
