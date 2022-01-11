<?php

namespace App\Controller;

use App\Entity\Critere;
use App\Entity\Criticite;
use App\Entity\Signalement;
use App\Entity\Situation;
use App\Repository\SituationRepository;
use Doctrine\Persistence\ManagerRegistry;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/signalement')]
class SignalementController extends AbstractController
{
    #[Route('/', name: 'signalement')]
    public function index(SituationRepository $situationRepository): Response
    {
        $title = "Signalez vos problèmes de logement";
        $etats = ["Etat moyen", "Mauvais état", "Très mauvais état"];
        $etats_classes = ["moyen", "grave", "tres-grave"];
        return $this->render('front/signalement.html.twig', [
            'title' => $title,
            'situations' => $situationRepository->findAllActive(),
            'etats' => $etats,
            'etats_classes' => $etats_classes
        ]);
    }

    /**
     * @throws Exception
     */
    #[Route('/envoi', name: 'envoi_signalement', methods: "POST")]
    public function envoi(Request $request, ManagerRegistry $doctrine, SluggerInterface $slugger): Response
    {
        if ($data = $request->get('signalement')) {
            $em = $doctrine->getManager();
            $signalement = new Signalement();
            $files_array = [];
            if ($files = $request->files->get('signalement')) {
                foreach ($files as $key => $file) {
                    foreach ($file as $file_) {
                        $originalFilename = pathinfo($file_->getClientOriginalName(), PATHINFO_FILENAME);
                        // this is needed to safely include the file name as part of the URL
                        $safeFilename = $slugger->slug($originalFilename);
                        $newFilename = $safeFilename . '-' . uniqid() . '.' . $file_->guessExtension();
                        try {
                            //TODO: Resize
                            $file_->move(
                                $this->getParameter('uploads_dir'),
                                $newFilename
                            );
                        } catch (FileException $e) {
                            // ... handle exception if something happens during file upload
                        }
                        $files_array[$key][] = $newFilename;
                    }
                }
                if (isset($files_array['documents']))
                    $signalement->setDocuments($files_array['documents']);
                if (isset($files_array['photos']))
                    $signalement->setPhotos($files_array['photos']);
            }
            foreach ($data as $key => $value) {
                $method = 'set' . ucfirst($key);
                switch ($key) {
                    case 'situation':
                        foreach ($data[$key] as $idSituation => $criteres) {
                            $situation = $em->getRepository(Situation::class)->find($idSituation);
                            $signalement->addSituation($situation);
                            $data[$key][$idSituation]['label'] = $situation->getLabel();
                            foreach ($criteres as $critere) {
                                foreach ($critere as $idCritere => $criticites) {
                                    $critere = $em->getRepository(Critere::class)->find($idCritere);
                                    $signalement->addCritere($critere);
                                    $data[$key][$idSituation]['critere'][$idCritere]['label'] = $critere->getLabel();
                                    foreach ($criticites as $criticite) {
                                        foreach ($criticite as $idCriticite => $null) {
                                            $criticite = $em->getRepository(Criticite::class)->find($idCriticite);
                                            $signalement->addCriticite($criticite);
                                            $data[$key][$idSituation]['critere'][$idCritere]['criticite'][$idCriticite]['label'] = $criticite->getLabel();
                                        }
                                    }
                                    /*var_dump(array_keys($critere));echo "----critere-----";*/
                                    /*$signalement->addCritere($em->getRepository(Critere::class)->find($idCritere));
                                    $signalement->addCriticite($em->getRepository(Criticite::class)->find($v['critere'][$idCritere]['criticite']));*/
                                }
                            }
                        }
                        $signalement->setJsonContent($data[$key]);
//                        die;
                        break;
                    case
                    'dateEntree':
                        $value = new \DateTimeImmutable($value);
                        $signalement->$method($value);
                        break;
                    default:
                        if($value === "" || $value === " ")
                            $value = null;
                        $signalement->$method($value);
                }
            }
            if ($em->getRepository(Signalement::class)->findOneBy([], ['id' => 'DESC'])) {
                $id = $em->getRepository(Signalement::class)->findOneBy([], ['id' => 'DESC'])->getId() + 1;
            } else {
                $id = 1;
            }
            $signalement->setReference((new \DateTime())->format('Ymd') . '-' . $id);
            $em->persist($signalement);
            $em->flush();
            return $this->json(['response' => 'success']);
        }
        return $this->json(['response' => 'error'], 400);
    }
}
