import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')
TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"
serviceId = "ea17e96a-7d44-4ebd-8cc3-ee6159965b0d"
stopId = "03029557-6609-11ed-98db-5adc55d213d0"
url = f"https://core.cittamobi.com.br/linesroutes/service/predictions?serviceId={serviceId}&stopId={stopId}"

req = urllib.request.Request(url, headers={
    "username": TOKEN,
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://linhas.cittamobi.com.br/"
})
ctx = ssl.create_default_context()
with urllib.request.urlopen(req, context=ctx) as resp:
    data = resp.read()

def parse_protobuf_fields(buf, depth=0):
    i = 0
    indent = "  " * depth
    while i < len(buf):
        # read varint for key
        key = 0
        shift = 0
        while i < len(buf):
            b = buf[i]
            i += 1
            key |= (b & 0x7f) << shift
            if not (b & 0x80):
                break
            shift += 7
        
        field_num = key >> 3
        wire_type = key & 0x7
        
        if wire_type == 0: # varint
            val = 0
            shift = 0
            while i < len(buf):
                b = buf[i]
                i += 1
                val |= (b & 0x7f) << shift
                if not (b & 0x80):
                    break
                shift += 7
            print(f"{indent}Field {field_num} (varint): {val}")
        elif wire_type == 1: # 64-bit
            val = buf[i:i+8]
            i += 8
            import struct
            d = struct.unpack('<d', val)[0]
            print(f"{indent}Field {field_num} (64-bit): hex={val.hex()}, as_double={d}")
        elif wire_type == 2: # length-delimited
            length = 0
            shift = 0
            while i < len(buf):
                b = buf[i]
                i += 1
                length |= (b & 0x7f) << shift
                if not (b & 0x80):
                    break
                shift += 7
            val = buf[i:i+length]
            i += length
            # try to see if it's utf-8 string or embedded message
            try:
                s = val.decode('utf-8')
                if all(c.isprintable() or c in '\r\n\t' for c in s):
                    print(f"{indent}Field {field_num} (string, len {length}): \"{s}\"")
                else:
                    print(f"{indent}Field {field_num} (sub-message, len {length}):")
                    parse_protobuf_fields(val, depth + 1)
            except:
                print(f"{indent}Field {field_num} (sub-message, len {length}):")
                parse_protobuf_fields(val, depth + 1)
        elif wire_type == 5: # 32-bit
            val = buf[i:i+4]
            i += 4
            import struct
            f = struct.unpack('<f', val)[0]
            print(f"{indent}Field {field_num} (32-bit): hex={val.hex()}, as_float={f}")
        else:
            print(f"{indent}Field {field_num} (unknown wire type {wire_type})")
            break

print("Parsing ServicePredictionsProto payload:")
parse_protobuf_fields(data)
