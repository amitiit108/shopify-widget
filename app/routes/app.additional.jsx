//import { Form, useLoaderData, useNavigation } from "react-router-dom";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";

import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query {
      shop {
        id
        metafield(namespace: "volume_discount", key: "rules") {
          jsonValue
        }
      }
    }
  `);

  const data = await res.json();

  return {
    shopId: data.data.shop.id,
    rules: data.data.shop.metafield?.jsonValue ?? {
      products: [],
      percentOff: 10,
    },
  };
}

// export async function action({ request }) {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();

//   const percentOff = Number(formData.get("percentOff"));
//   const products = JSON.parse(formData.get("products"));

//   const FUNCTION_ID = process.env.SHOPIFY_VOLUME_DISCOUNT_FUNCTION_ID;

//   if (!FUNCTION_ID) {
//     throw new Error("Missing function ID env variable");
//   }

//   const response = await admin.graphql(
//     `#graphql
//     mutation CreateAutomaticDiscount($input: DiscountAutomaticAppInput!) {
//       discountAutomaticAppCreate(automaticAppDiscount: $input) {
//         automaticAppDiscount {
//           id
//         }
//         userErrors {
//           field
//           message
//         }
//       }
//     }`,
//     {
//       variables: {
//         input: {
//           title: "Buy 2+, Get % Off",
//           functionId: FUNCTION_ID,
//           startsAt: new Date().toISOString(),
//           configuration: JSON.stringify({
//             minQty: 2,
//             percentOff,
//             products,
//           }),
//         },
//       },
//     }
//   );

//   const result = await response.json();

//   const errors =
//     result.data?.discountAutomaticAppCreate?.userErrors ?? [];

//   if (errors.length > 0) {
//     console.error(errors);
//     throw new Error(errors.map(e => e.message).join(", "));
//   }

//   return null;
// }
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();

  const shopId = form.get("shopId");

  const rules = {
    products: JSON.parse(form.get("products")),
    minQty: 2,
    percentOff: Number(form.get("percentOff")),
  };

  await admin.graphql(
    `#graphql
    mutation SetVolumeDiscountRules($ownerId: ID!, $rules: JSON!) {
      metafieldsSet(metafields: [{
        ownerId: $ownerId
        namespace: "volume_discount"
        key: "rules"
        type: "json"
        value: $rules
      }]) {
        userErrors { message }
      }
    }`,
    { variables: { ownerId: shopId, rules } }
  );

  return redirect("/app/additional");
}


export default function AdditionalPage() {
  const { shopId, rules } = useLoaderData();
  const navigation = useNavigation();

  return (
    <s-page heading="Buy 2, Get % Off">
      <s-section>
        <s-card>
          <Form method="post">
            <input type="hidden" name="shopId" value={shopId} />

            <s-stack gap="400">
              <s-text>
                Configure a volume discount. When customers buy 2 or more units,
                they receive a percentage discount.
              </s-text>

              <s-text-field
                label="Product IDs (JSON array)"
                name="products"
                multiline
                defaultValue={JSON.stringify(rules.products, null, 2)}
              />

              <s-text-field
                label="Percent off"
                name="percentOff"
                type="number"
                defaultValue={rules.percentOff}
              />


              <s-button
                submit
                loading={navigation.state !== "idle"}
                variant="primary"
              >
                Save
              </s-button>
            </s-stack>
          </Form>
        </s-card>
      </s-section>
    </s-page>
  );
}
