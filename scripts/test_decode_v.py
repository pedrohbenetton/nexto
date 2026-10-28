import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')
TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"

ctx = ssl.create_default_context()

def decode_proto_vehicles(buf):
    i = 0
    vehicles = []
    while i < len(buf):
        key = 0; shift = 0
        while i < len(buf):
            b = buf[i]; i += 1
            key |= (b & 0x7f) << shift
            if not (b & 0x80): break
            shift += 7
        field_num = key >> 3
        wire_type = key & 0x7
        if wire_type == 0:
            val = 0; shift = 0
            while i < len(buf):
                b = buf[i]; i += 1
                val |= (b & 0x7f) << shift
                if not (b & 0x80): break
                shift += 7
        elif wire_type == 1:
            i += 8
        elif wire_type == 2:
            length = 0; shift = 0
            while i < len(buf):
                b = buf[i]; i += 1
                length |= (b & 0x7f) << shift
                if not (b & 0x80): break
                shift += 7
            sub_buf = buf[i:i+length]; i += length
            if field_num == 12: # vehicle sub-message
                # decode vehicle
                v = {}
                j = 0
                while j < len(sub_buf):
                    vk = 0; vshift = 0
                    while j < len(sub_buf):
                        b = sub_buf[j]; j += 1
                        vk |= (b & 0x7f) << vshift
                        if not (b & 0x80): break
                        vshift += 7
                    vf = vk >> 3
                    vwt = vk & 0x7
                    if vwt == 0:
                        vval = 0; vshift = 0
                        while j < len(sub_buf):
                            b = sub_buf[j]; j += 1
                            vval |= (b & 0x7f) << vshift
                            if not (b & 0x80): break
                            vshift += 7
                        if vf == 3: v['seconds'] = vval
                        elif vf == 10: v['isRealTime'] = bool(vval)
                        elif vf == 11: v['sequence'] = vval
                    elif vwt == 1: # 64-bit float
                        import struct
                        dbl = struct.unpack('<d', sub_buf[j:j+8])[0]
                        j += 8
                        if vf == 8: v['lat'] = dbl
                        elif vf == 9: v['lng'] = dbl
                    elif vwt == 2:
                        l = 0; s = 0
                        while j < len(sub_buf):
                            b = sub_buf[j]; j += 1
                            l |= (b & 0x7f) << s
                            if not (b & 0x80): break
                            s += 7
                        sval = sub_buf[j:j+l].decode('utf-8', errors='ignore')
                        j += l
                        if vf == 1: v['id'] = sval
                        elif vf == 2: v['plate'] = sval
                    else:
                        break
                vehicles.append(v)
        elif wire_type == 5:
            i += 4
    return vehicles

url = "https://core.cittamobi.com.br/linesroutes/service/predictions?serviceId=27b641ed-fc28-4571-8408-6d55b0375373&stopId=030c7e0a-6609-11ed-98db-5adc55d213d0"
req = urllib.request.Request(url, headers={"username": TOKEN, "User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, context=ctx) as r:
    v = decode_proto_vehicles(r.read())
    print("BRT Vehicles:", v)
