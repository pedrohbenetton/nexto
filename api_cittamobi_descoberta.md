# Documentação de Engenharia Reversa - Cittamobi API

Documento gerado a partir da inspeção dos pacotes de produção do cliente web oficial (`https://linhas.cittamobi.com.br/`), especificamente `main.6231f614a255aee3.js` e `route-line.js?v=20260714a`.

---

## 1. Hosts & Ambientes

| Identificador Interno | Host Base | Finalidade |
| :--- | :--- | :--- |
| `apiPrimova` (Core) | `https://core.cittamobi.com.br` | Endpoints de previsão em tempo real, autocomplete e roteirizador (Protobuf) |
| `apiCittamobi` | `https://api.cittamobi.com.br` | Metadados de cidades, operadoras e configurações estáticas |
| `urlContent` | `https://linhas.cittamobi.com.br/lines` | Conteúdo e páginas estáticas de linhas e rotas |

---

## 2. Autenticação & Cabeçalhos

O cliente web do Cittamobi utiliza autenticação estática via cabeçalho HTTP:

```http
username: $2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6
Content-Type: application/json; charset=utf-8
```

> **Nota:** As requisições para o `core.cittamobi.com.br` retornam payloads binários do tipo `application/x-protobuf`.

---

## 3. Endpoints Mapeados

### 3.1. Autocomplete / Busca de Locais e Paradas
* **Método:** `GET`
* **URL:** `https://core.cittamobi.com.br/tripplanner/proto/autocomplete?term={termo}&lat={lat}&lng={lng}`
* **Parâmetros:**
  * `term` (obrigatório): Texto pesquisado pelo usuário (ex: "Paulista", "Terminal").
  * `lat` e `lng` (opcionais): Coordenadas para ordenar paradas mais próximas.
* **Cabeçalhos de Resposta Notáveis:**
  * `Content-Type: application/x-protobuf`
  * `X-Protobuf-Schema: cittamobi_core.proto`
  * `X-Protobuf-Message: br.com.cittamobi.core.PlacesSearchProto`

### 3.2. Previsão de Chegada em Tempo Real (Stop Predictions)
* **Método:** `GET`
* **URL:** `https://core.cittamobi.com.br/linesroutes/service/predictions?serviceId={serviceId}&stopId={stopId}`
* **Parâmetros:**
  * `serviceId`: Identificador da linha/serviço no sistema da cidade/Cittamobi.
  * `stopId`: Identificador do ponto/parada de ônibus.
* **Mensagem Protobuf de Resposta:** `proto.br.com.cittamobi.core.ServicePredictionsProto`
* **Observação:** No código frontend web, é exposto globalmente através de:
  ```javascript
  window.CittamobiAPI.fetchStopPredictions(serviceId, stopId)
  ```

### 3.3. Detalhes de Ponto / Chave de Local
* **Método:** `GET`
* **URL:** `https://core.cittamobi.com.br/tripplanner/proto/place/key?text={nome}&key={chave}`
* **Resposta:** Dados geográficos e de paradas associadas.

### 3.4. Planejador de Rotas e Itinerários
* **Método:** `POST` ou `GET`
* **URL:** `https://core.cittamobi.com.br/trip_search/?fromLat={s}&fromLng={T}&toLat={c}&toLng={p}&startTime={u}&startTimeItinerary={g}&walkdistance={h}&toLocationName={L}`
* **Mensagens Protobuf:**
  * `proto.br.com.cittamobi.core.TripPlanDataRequest`
  * `proto.br.com.cittamobi.core.TripPlanDataResponse`

---

## 4. Estruturas Protobuf Identificadas no Bundle JS

Os esquemas compilados foram encontrados no pacote Angular. As seguintes entidades compõem o modelo de dados:

* `proto.br.com.cittamobi.core.PlacesSearchProto`
  * Campo 2 (repeated): `proto.br.com.cittamobi.core.PlacesLocationProto`
* `proto.br.com.cittamobi.core.ServicePredictionsProto`
  * Enum: `proto.br.com.cittamobi.core.ServicePredictionsProto.PredictionType`
* `proto.br.com.cittamobi.core.TripPlanDataProto`
* `proto.br.com.cittamobi.core.TripPlanDataRequest`
* `proto.br.com.cittamobi.core.TripPlanDataResponse`
* `proto.br.com.cittamobi.core.WalkStepDataProto`
* `proto.br.com.cittamobi.core.CityProto`
* `proto.br.com.cittamobi.core.PlacesLocationProto`

---

## 5. Prova de Conceito (PoC de Requisição)

Você pode testar a viabilidade com o seguinte comando cURL:

```bash
curl -i \
  -H "username: \$2a\$10\$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6" \
  "https://core.cittamobi.com.br/tripplanner/proto/autocomplete?term=Paulista"
```

**Resultado esperado:**
* Status `HTTP/1.1 200 OK`
* Cabeçalho `Content-Type: application/x-protobuf`
* Retorno de buffer binário contendo os locais encontrados.

---

## 6. Próximos Passos para o Agente de Desenvolvimento

1. **Decodificação Protobuf:**
   * Utilizar bibliotecas como `protobufjs` no Node.js ou `blackboxprotobuf` / `protobuf` em Python para converter as respostas binárias em JSON legível.
2. **Criação do BFF (Backend for Frontend):**
   * Criar um servidor local (Fastify / Express / FastAPI) que faça a requisição ao `core.cittamobi.com.br`, decodifique o Protobuf e entregue JSON puro para o frontend.
   * Eliminar problemas de CORS no navegador.
3. **Desenvolvimento da Interface:**
   * Criar o mapa (MapLibre/Leaflet), campo de busca e cartões com previsão de tempo de chegada dos ônibus sem qualquer banner publicitário.
