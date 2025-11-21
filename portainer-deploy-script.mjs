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
    await this.pararEDeletarContainerEspecifico();

    await this.pullarImagemDockerHub();
    await this.criarContainer();
    await this.rodarContainer();
    await this.limparImagensAntigas();
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
      console.log("Puxou a imagem do dockerhub com sucesso: ", response.data);
    } catch (err) {
      throw new Error(
        "Erro ao puxar a imagem do Docker Hub: " +
          (err.response?.data?.message || err.message)
      );
    }
  };

  pararEDeletarContainerEspecifico = async () => {
    try {
      console.log(
        `Buscando container específico: ${this.NomeImagem} (${this.Imagem})`
      );

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
          container.Names?.some((name) => name.includes(`/${this.NomeImagem}`))
      );

      if (targetContainer) {
        console.log(
          `Container encontrado: ${targetContainer.Id.substring(0, 12)} (${
            targetContainer.Names?.[0] || "sem nome"
          })`
        );

        if (targetContainer.State === "running") {
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
            console.log(
              `✓ Container ${targetContainer.Id.substring(
                0,
                12
              )} parado com sucesso.`
            );
          } catch (err) {
            console.log(
              `Container já estava parado ou erro ao parar: ${err.message}`
            );
          }
        } else {
          console.log(`ℹ Container já estava parado.`);
        }

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
          console.log(
            `Container ${targetContainer.Id.substring(
              0,
              12
            )} deletado com sucesso.`
          );
        } catch (err) {
          console.error(`Erro ao deletar o container: ${err.message}`);
          throw new Error(
            `Falha ao deletar container existente: ${err.message}`
          );
        }
      } else {
        console.log(
          `ℹ Nenhum container existente encontrado para ${this.NomeImagem}. Criando novo container.`
        );
      }
    } catch (error) {
      console.error(`Erro ao buscar/deletar container: ${error.message}`);
      throw error;
    }
  };

  limparImagensAntigas = async () => {
    try {
      console.log("Iniciando limpeza de imagens antigas...");

      const listImagesConfig = {
        method: "get",
        url:
          this.portainerUrl +
          `/endpoints/${this.endpointId}/docker/images/json`,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        httpsAgent: agent,
      };
      const imagesResponse = await axios(listImagesConfig);
      const images = imagesResponse.data;

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
      const containersResponse = await axios(listContainersConfig);
      const containers = containersResponse.data;
      const imagesInUse = new Set(
        containers.map((c) => c.ImageID || c.Image).filter(Boolean)
      );

      const imageRepo = this.Imagem.split(":")[0];
      const oldImages = images.filter((img) => {
        const imageId = img.Id || img.RepoTags?.[0] || img.RepoDigests?.[0];

        if (imagesInUse.has(imageId)) {
          return false;
        }

        const hasMatchingRepo =
          (img.RepoTags &&
            img.RepoTags.some((tag) => tag.startsWith(imageRepo))) ||
          (img.RepoDigests &&
            img.RepoDigests.some((digest) => digest.startsWith(imageRepo)));

        if (!hasMatchingRepo) {
          return false;
        }

        const isCurrentImage =
          (img.RepoTags && img.RepoTags.includes(this.Imagem)) ||
          (img.RepoTags && img.RepoTags.some((tag) => tag === this.Imagem));

        return !isCurrentImage;
      });

      if (oldImages.length > 0) {
        console.log(
          `Encontradas ${oldImages.length} imagem(ns) antiga(s) para limpeza:`
        );

        let removedCount = 0;
        for (const image of oldImages) {
          try {
            const imageId =
              image.Id || image.RepoTags?.[0] || image.RepoDigests?.[0];
            const imageName =
              image.RepoTags?.[0] || imageId.substring(0, 12) || "sem nome";

            console.log(`  - Removendo: ${imageName}`);

            const deleteImageConfig = {
              method: "delete",
              url:
                this.portainerUrl +
                `/endpoints/${this.endpointId}/docker/images/${imageId}?force=true&noprune=false`,
              headers: {
                Authorization: `Bearer ${this.token}`,
              },
              httpsAgent: agent,
            };
            await axios(deleteImageConfig);
            removedCount++;
            console.log(`  Imagem removida: ${imageName}`);
          } catch (err) {
            console.log(
              `  Não foi possível remover imagem: ${
                err.response?.data?.message || err.message
              }`
            );
          }
        }

        console.log(
          `Limpeza concluída: ${removedCount}/${oldImages.length} imagem(ns) removida(s).`
        );
      } else {
        console.log("ℹ Nenhuma imagem antiga encontrada para limpeza.");
      }
    } catch (error) {
      console.error(
        `Aviso: Erro ao limpar imagens antigas (continuando...): ${error.message}`
      );
      if (error.response?.data) {
        console.error(`  Detalhes: ${JSON.stringify(error.response.data)}`);
      }
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
      console.log("Rodou o container com sucesso: ", response.data);
    } catch (err) {
      console.error(
        "Erro ao rodar o container:",
        err.response?.data || err.message
      );
      throw new Error(
        "Erro ao rodar o container: " +
          (err.response?.data?.message || err.message)
      );
    }
  };
}

const deploy = new DeployPortainer();
deploy.executaGitOps();
