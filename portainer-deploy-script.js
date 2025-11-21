import axios from "axios";
import https from "https";
const agent = new https.Agent({
  rejectUnauthorized: false,
});

class DeployPortainer {
  constructor() {
    if (!process.env.PORTAINER_URL) {
      throw new Error("PORTAINER_URL é obrigatório");
    }
    if (!process.env.PORTAINER_ENDPOINT_ID) {
      throw new Error("PORTAINER_ENDPOINT_ID é obrigatório");
    }
    if (!process.env.DOCKER_HUB_USERNAME) {
      throw new Error("DOCKER_HUB_USERNAME é obrigatório");
    }
    if (!process.env.PORTAINER_USERNAME) {
      throw new Error("PORTAINER_USERNAME é obrigatório");
    }
    if (!process.env.PORTAINER_PASSWORD) {
      throw new Error("PORTAINER_PASSWORD é obrigatório");
    }

    this.portainerUrl = process.env.PORTAINER_URL;
    this.endpointId = process.env.PORTAINER_ENDPOINT_ID;
    this.dockerAuth = process.env.DOCKER_AUTH;
    this.Username = process.env.PORTAINER_USERNAME;
    this.Password = process.env.PORTAINER_PASSWORD;
    this.idContainer = "";
    this.token = "";
    const dockerHubUsername = process.env.DOCKER_HUB_USERNAME;
    this.Imagem = `${dockerHubUsername}/hub-logistica-backend:latest`;
    this.NomeImagem = "hub-logistica-backend";
    this.ExposedPorts = process.env.CONTAINER_PORT || "4010";
  }

  executaGitOps = async () => {
    await this.portainerLogin();
    await this.pararEDeletarContainerPorImagem();
    await this.deletarContainerParados();

    await this.pullarImagemDockerHub();
    await this.criarContainer();
    await this.rodarContainer();
    this.deletarImagensParadas();
  };

  portainerLogin = async () => {
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: this.portainerUrl + "/auth",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        Username: this.Username,
        Password: this.Password,
      },
      httpsAgent: agent,
    };
    try {
      const response = await axios(config);
      const token = response.data.jwt;
      this.token = token;
      console.log("Fez login no portainer com sucesso!");
    } catch (err) {
      throw new Error("Erro ao logar no Portainer");
    }
  };

  pullarImagemDockerHub = async () => {
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.portainerUrl +
        `/endpoints/${this.endpointId}/docker/images/create?fromImage=` +
        this.Imagem +
        "",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "X-Registry-Auth": this.dockerAuth,
      },
      httpsAgent: agent,
    };
    try {
      const response = await axios(config);
      console.log("Puxou a imagem do dockerhub com sucesso!");
    } catch (err) {
      throw new Error("Erro ao puxar a imagem do Docker Hub");
    }
  };

  pararEDeletarContainerPorImagem = async () => {
    try {
      const listContainersConfig = {
        method: "get",
        url:
          this.portainerUrl +
          `/endpoints/${this.endpointId}/docker/containers/json?all=true`,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        httpsAgent: agent,
      };
      const response = await axios(listContainersConfig);
      const containers = response.data;

      const targetContainer = containers.find(
        (container) =>
          container.Image === this.Imagem ||
          container.Names?.some((name) => name.includes(this.NomeImagem))
      );

      if (targetContainer) {
        // Parar o container se estiver rodando
        try {
          const stopContainerConfig = {
            method: "post",
            url:
              this.portainerUrl +
              `/endpoints/${this.endpointId}/docker/containers/${targetContainer.Id}/stop`,
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
            httpsAgent: agent,
          };
          await axios(stopContainerConfig);
          console.log(`Container ${targetContainer.Id} parado com sucesso.`);
        } catch (err) {
          // Container pode já estar parado
          console.log(
            "Container já estava parado ou erro ao parar (continuando...)"
          );
        }

        // Deletar o container
        try {
          const deleteContainerConfig = {
            method: "delete",
            url:
              this.portainerUrl +
              `/endpoints/${this.endpointId}/docker/containers/${targetContainer.Id}?force=true`,
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
            httpsAgent: agent,
          };
          await axios(deleteContainerConfig);
          console.log(`Container ${targetContainer.Id} deletado com sucesso.`);
        } catch (err) {
          console.error("Erro ao deletar o container:", err.message);
        }
      } else {
        console.log(
          "Nenhum container encontrado com a imagem ou nome especificado."
        );
      }
    } catch (error) {
      console.error("Erro ao parar/deletar o container:", error);
    }
  };
  deletarContainerParados = async () => {
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.portainerUrl +
        `/endpoints/${this.endpointId}/docker/containers/prune`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      httpsAgent: agent,
    };
    try {
      const response = await axios(config);
      console.log("Deletou containers parados com sucesso");
    } catch (err) {
      throw new Error("Erro ao deletar os containers parados");
    }
  };

  deletarImagensParadas = async () => {
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.portainerUrl + `/endpoints/${this.endpointId}/docker/images/prune`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      httpsAgent: agent,
    };
    try {
      const response = await axios(config);
      console.log("Deletou images parados com sucesso");
    } catch (err) {
      throw new Error("Erro ao deletar os images parados");
    }
  };

  criarContainer = async () => {
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.portainerUrl +
        `/endpoints/${this.endpointId}/docker/containers/create`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      data: {
        name: this.NomeImagem,
        Image: this.Imagem,
        ExposedPorts: { "4010/tcp": {} },
        HostConfig: {
          PortBindings: { "4010/tcp": [{ HostPort: this.ExposedPorts }] },
          RestartPolicy: { Name: "unless-stopped" },
        },
        Env: [
          `NODE_ENV=production`,
          `PORT=${this.ExposedPorts}`,
          process.env.DB_NAME ? `DB_NAME=${process.env.DB_NAME}` : null,
          process.env.DB_USER ? `DB_USER=${process.env.DB_USER}` : null,
          process.env.DB_PASSWORD
            ? `DB_PASSWORD=${process.env.DB_PASSWORD}`
            : null,
          process.env.DB_HOST ? `DB_HOST=${process.env.DB_HOST}` : null,
          process.env.DB_DIALECT
            ? `DB_DIALECT=${process.env.DB_DIALECT}`
            : null,
          process.env.DB_PORT ? `DB_PORT=${process.env.DB_PORT}` : null,
          process.env.JWT_SECRET
            ? `JWT_SECRET=${process.env.JWT_SECRET}`
            : null,
          process.env.LOKI_HOST ? `LOKI_HOST=${process.env.LOKI_HOST}` : null,
          process.env.LOKI_PORT ? `LOKI_PORT=${process.env.LOKI_PORT}` : null,
          process.env.SKIP_LOKI_DIAGNOSTICS
            ? `SKIP_LOKI_DIAGNOSTICS=${process.env.SKIP_LOKI_DIAGNOSTICS}`
            : null,
        ].filter(Boolean),
      },
      httpsAgent: agent,
    };
    try {
      const response = await axios(config);
      this.idContainer = response.data.Id;
      console.log("Criou o container com sucesso!");
    } catch (err) {
      console.error(
        "Erro ao criar o container:",
        err.response?.data || err.message
      );
      throw new Error("Erro ao criar o container");
    }
  };

  rodarContainer = async () => {
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url:
        this.portainerUrl +
        `/endpoints/${this.endpointId}/docker/containers/${this.idContainer}/start`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      httpsAgent: agent,
    };

    try {
      const response = await axios(config);
      console.log("Rodou o container com sucesso!");
    } catch (err) {
      console.error(
        "Erro ao rodar o container:",
        err.response?.data || err.message
      );
      throw new Error("Erro ao rodar o container");
    }
  };
}

const deploy = new DeployPortainer();
deploy.executaGitOps();
