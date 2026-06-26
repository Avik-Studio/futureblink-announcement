import shopify from "../shopify.js";

export const METAFIELD_NAMESPACE = "my_app";
export const METAFIELD_KEY = "announcement";
const METAFIELD_TYPE = "single_line_text_field";

export async function setAnnouncementMetafield(session, value) {
  const client = new shopify.api.clients.Graphql({ session });

  await ensureDefinition(client);

  const shopId = await getShopId(client);

  const response = await client.request(
    `#graphql
    mutation SetAnnouncement($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key value }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: METAFIELD_TYPE,
            value,
          },
        ],
      },
    }
  );

  const userErrors = response?.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(
      "Shopify metafield error: " + userErrors.map((e) => e.message).join("; ")
    );
  }

  return response.data.metafieldsSet.metafields[0];
}

async function getShopId(client) {
  const res = await client.request(`#graphql
    query ShopId { shop { id } }`);
  return res.data.shop.id;
}

async function ensureDefinition(client) {
  // Try to create the definition with PUBLIC_READ storefront access
  const createRes = await client.request(
    `#graphql
    mutation CreateDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }`,
    {
      variables: {
        definition: {
          name: "App Announcement",
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          description: "Announcement banner text shown on the storefront.",
          type: METAFIELD_TYPE,
          ownerType: "SHOP",
          access: { storefront: "PUBLIC_READ" },
        },
      },
    }
  ).catch((err) => {
    console.warn("metafieldDefinitionCreate error:", err.message);
    return null;
  });

  const errors = createRes?.data?.metafieldDefinitionCreate?.userErrors ?? [];
  const isTaken = errors.some((e) => e.code === "TAKEN");

  if (!isTaken) return; // created successfully or non-fatal error

  // Definition already exists — ensure it has PUBLIC_READ storefront access
  try {
    await client.request(
      `#graphql
      mutation UpdateDefinition($definition: MetafieldDefinitionUpdateInput!) {
        metafieldDefinitionUpdate(definition: $definition) {
          updatedDefinition { id }
          userErrors { field message code }
        }
      }`,
      {
        variables: {
          definition: {
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            ownerType: "SHOP",
            access: { storefront: "PUBLIC_READ" },
          },
        },
      }
    );
  } catch (err) {
    console.warn("Could not update metafield definition access:", err.message);
  }
}
